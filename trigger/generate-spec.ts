import { randomUUID } from "node:crypto"

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { put } from "@vercel/blob"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { generateText } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

/**
 * Spec generation background task.
 *
 * Turns the current canvas (nodes + edges) and the room's chat history into a
 * Markdown technical specification using Gemini. Unlike the design agent this
 * task never mutates the collaborative canvas — it only reads the supplied
 * snapshot and produces a document, which it returns as the task output.
 *
 * Progress is published to the run's metadata (status + phase) so the client
 * can follow along in realtime via `useRealtimeRun` without any Liveblocks
 * involvement — spec generation is a per-user document, not shared room state.
 *
 * Retries are safe here (the task is read-only and idempotent — the same inputs
 * yield an equivalent document), so it inherits the project's default retry
 * policy rather than opting out like the design agent.
 */

// --- Model selection (mirrors the design agent) ---

/**
 * Gemini model used to draft the spec. Overridable via env so you can switch
 * models without a code change. Defaults to the rolling `-latest` alias, which
 * Google keeps pointed at the current stable Flash model.
 */
const MODEL_ID = process.env.GOOGLE_AI_MODEL ?? "gemini-flash-latest"

/**
 * Models tried in order. The primary is attempted first (with SDK-level
 * retries); if it stays overloaded or fails, we fall back to lighter flash
 * aliases that usually have spare capacity.
 */
const MODEL_CANDIDATES = Array.from(
  new Set([MODEL_ID, "gemini-flash-lite-latest", "gemini-2.5-flash-lite"]),
)

// --- Input validation ---

/** A single chat message the spec should take into account. */
const chatMessageSchema = z.object({
  /** Who authored the message. Defaults to "user" when absent. */
  role: z.string().optional(),
  /** The message text. */
  content: z.string(),
})

/** A canvas node, validated loosely — only the fields the model reads. */
const nodeSchema = z
  .object({
    id: z.string(),
    data: z
      .object({
        label: z.string().optional(),
        shape: z.string().optional(),
      })
      .partial()
      .optional(),
    position: z
      .object({ x: z.number(), y: z.number() })
      .partial()
      .optional(),
  })
  .passthrough()

/** A canvas edge, validated loosely — only the fields the model reads. */
const edgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    data: z.object({ label: z.string().optional() }).partial().optional(),
  })
  .passthrough()

const inputSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema).default([]),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
})

/** The validated task input. */
export type GenerateSpecInput = z.infer<typeof inputSchema>

type SpecNode = z.infer<typeof nodeSchema>
type SpecEdge = z.infer<typeof edgeSchema>
type SpecChatMessage = z.infer<typeof chatMessageSchema>

export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: GenerateSpecInput) => {
    // Validate defensively — the payload originates from a client request, so
    // never trust its shape even though the API route also checks it.
    const input = inputSchema.parse(payload)
    const { projectId, roomId, chatHistory, nodes, edges } = input

    logger.log("Generate spec task running", {
      projectId,
      roomId,
      nodes: nodes.length,
      edges: edges.length,
      messages: chatHistory.length,
    })

    setStatus("thinking", "Reading the canvas and chat context…")

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    })

    try {
      setStatus("processing", "Drafting the technical spec…")

      const spec = await draftSpec(
        google,
        buildPrompt(chatHistory, nodes, edges),
        (note) => setStatus("processing", note),
      )

      logger.log("Spec generated", { length: spec.length })

      // Persist the spec: the Markdown content lives in Vercel Blob, while
      // Prisma keeps only metadata (which project it belongs to + the blob URL).
      // Mirrors the canvas persistence pattern — private store, so the file is
      // read back through the authenticated blob helper in the download route,
      // never a public URL. Each spec gets a unique blob path so a project can
      // accumulate a history of generated specs.
      setStatus("processing", "Saving the spec…")

      const blob = await put(`specs/${projectId}/${randomUUID()}.md`, spec, {
        access: "private",
        contentType: "text/markdown",
      })

      const record = await prisma.projectSpec.create({
        data: { projectId, filePath: blob.url },
        select: { id: true },
      })

      logger.log("Spec persisted", { specId: record.id })

      setStatus("complete", "Spec ready.")

      return { projectId, roomId, specId: record.id, spec }
    } catch (error) {
      logger.error("Generate spec failed", { error: String(error) })
      setStatus("error", "Something went wrong while generating the spec.")
      throw error
    }
  },
})

/** Phase the run is in, mirrored into run metadata for realtime tracking. */
type SpecPhase = "thinking" | "processing" | "complete" | "error"

/**
 * Publishes the current phase + human-readable status to the run's metadata so
 * a subscriber (useRealtimeRun) can render progress. Best-effort: metadata
 * writes never throw, but guard anyway so status never aborts generation.
 */
function setStatus(phase: SpecPhase, status: string) {
  try {
    metadata.set("phase", phase)
    metadata.set("status", status)
  } catch {
    // Outside a run context (e.g. tests) metadata is a no-op — ignore.
  }
}

/**
 * Drafts the spec, trying each candidate model in turn. Each model gets the AI
 * SDK's exponential-backoff retries (for transient 429/503 overloads); if a
 * model still fails, we fall back to the next. Throws the last error only if
 * every candidate fails.
 */
async function draftSpec(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  prompt: string,
  onFallback: (note: string) => void,
): Promise<string> {
  let lastError: unknown
  for (let i = 0; i < MODEL_CANDIDATES.length; i++) {
    const modelId = MODEL_CANDIDATES[i]
    try {
      if (i > 0) {
        onFallback(`Model busy — retrying with ${modelId}…`)
      }
      const { text } = await generateText({
        model: google(modelId),
        prompt,
        // Ride out transient overloads before falling back to the next model.
        maxRetries: 3,
      })
      const spec = text.trim()
      if (spec.length > 0) return spec
      lastError = new Error("Model returned an empty spec")
    } catch (error) {
      lastError = error
      logger.warn("Model failed, trying next candidate", {
        modelId,
        error: String(error),
      })
    }
  }
  throw lastError
}

/** Builds the model prompt: canvas snapshot + chat context + output rules. */
function buildPrompt(
  chatHistory: SpecChatMessage[],
  nodes: SpecNode[],
  edges: SpecEdge[],
): string {
  const canvas =
    nodes.length === 0 && edges.length === 0
      ? "The canvas is currently empty."
      : [
          "Nodes (id | shape | label | position):",
          ...nodes.map((node) => {
            const label = node.data?.label ?? ""
            const shape = node.data?.shape ?? "node"
            const x = Math.round(node.position?.x ?? 0)
            const y = Math.round(node.position?.y ?? 0)
            return `- ${node.id} | ${shape} | "${label}" | (${x}, ${y})`
          }),
          "Edges (id | source -> target | label):",
          ...edges.map((edge) => {
            const label = edge.data?.label ?? ""
            return `- ${edge.id} | ${edge.source} -> ${edge.target}${
              label ? ` | "${label}"` : ""
            }`
          }),
        ].join("\n")

  const conversation =
    chatHistory.length === 0
      ? "No chat discussion was provided."
      : chatHistory
          .map((message) => {
            const role = (message.role ?? "user").toLowerCase()
            const who = role === "assistant" ? "AI" : "User"
            return `${who}: ${message.content}`
          })
          .join("\n")

  return `You are Ghost AI, a senior software architect. Write a clear, well-structured technical specification for the system described by the architecture diagram and the team's discussion below.

Output rules:
- Respond with GitHub-flavored Markdown ONLY. Do not wrap the whole document in a code fence.
- Start with a top-level "# " title, then organized sections with "## " headings.
- Recommended sections (include those that apply): Overview, Goals, Architecture / Components, Data Flow, APIs / Interfaces, Data Model, and Open Questions.
- Ground the spec in the actual nodes, edges, and discussion — describe the components on the canvas and how they connect. Do not invent components that are not implied by the inputs.
- Be concise and technical; prefer bullet points and short paragraphs over filler.

Architecture diagram:
${canvas}

Team discussion:
${conversation}`
}
