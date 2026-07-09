import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { mutateFlow } from "@liveblocks/react-flow/node"
import { logger, task } from "@trigger.dev/sdk"
import { generateText, Output } from "ai"
import { z } from "zod"

import { getLiveblocks } from "@/lib/liveblocks"
import type { GhostAiPhase, GhostAiState } from "@/types/ai"
import { AI_STATUS_FEED_KEY, type AiStatusMessage } from "@/types/tasks"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_MARKER,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas"

/**
 * Design agent background task.
 *
 * Interprets a natural-language prompt with Gemini and turns it into concrete
 * changes on the collaborative canvas, updating everyone in the room in real
 * time. The canvas itself is mutated through the same @liveblocks/react-flow
 * storage the client uses (via `mutateFlow`), so AI edits behave exactly like
 * hand-drawn ones. The agent's presence (cursor + thinking state) and a shared
 * status feed are published to Liveblocks Storage so all participants can see
 * what the AI is doing while it works.
 *
 * Retries are disabled: canvas mutations are not idempotent across regenerated
 * plans (each attempt would produce fresh node ids and duplicate the diagram),
 * so a failure is surfaced through the status feed rather than retried.
 */

// --- Design-system rules the generated diagram must follow ---

/** Allowed node shapes (mirrors {@link CanvasNodeShape}). */
const SHAPE_IDS = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

/** Allowed palette ids (mirrors {@link NODE_COLORS}). */
const COLOR_IDS = NODE_COLORS.map((pair) => pair.id) as [string, ...string[]]

/**
 * Gemini model used to interpret prompts. Overridable via env so you can switch
 * models (e.g. if one has no quota on your account) without a code change.
 *
 * Defaults to the rolling `-latest` alias, which Google keeps pointed at the
 * current stable Flash model — pinned versions (e.g. `gemini-2.5-flash`) get
 * retired over time and return "model is no longer available".
 */
const MODEL_ID = process.env.GOOGLE_AI_MODEL ?? "gemini-flash-latest"

/**
 * Models tried in order. The primary is attempted first (with its own SDK-level
 * retries); if it stays overloaded ("high demand") or otherwise fails, we fall
 * back to lighter flash aliases that usually have spare capacity. This runs
 * before any canvas mutation, so retrying/falling back is always safe.
 */
const MODEL_CANDIDATES = Array.from(
  new Set([MODEL_ID, "gemini-flash-lite-latest", "gemini-2.5-flash-lite"]),
)

/** Default drop sizes per shape, mirroring the shape panel, so nodes look right. */
const SHAPE_SIZE: Record<CanvasNodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 90 },
  diamond: { width: 140, height: 140 },
  circle: { width: 110, height: 110 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 140 },
  hexagon: { width: 150, height: 120 },
}

// --- The plan the model produces ---

/**
 * A single canvas action. Kept as one flat object with a `type` discriminator
 * and optional fields (rather than a discriminated union) because Gemini's
 * structured-output mode handles a single object schema far more reliably than
 * `anyOf`/`oneOf`. Fields are validated per-type when applied.
 */
const actionSchema = z.object({
  type: z.enum([
    "addNode",
    "moveNode",
    "resizeNode",
    "updateNode",
    "deleteNode",
    "addEdge",
    "deleteEdge",
  ]),
  /** Node/edge id the action targets or creates. */
  id: z.string().optional(),
  /** addNode/updateNode: node shape. */
  shape: z.enum(SHAPE_IDS).optional(),
  /** addNode/updateNode: node label. */
  label: z.string().optional(),
  /** addNode/updateNode: palette id. */
  color: z.enum(COLOR_IDS).optional(),
  /** addNode/moveNode: top-left x in canvas units. */
  x: z.number().optional(),
  /** addNode/moveNode: top-left y in canvas units. */
  y: z.number().optional(),
  /** resizeNode: width in canvas units. */
  width: z.number().optional(),
  /** resizeNode: height in canvas units. */
  height: z.number().optional(),
  /** addEdge: source node id. */
  source: z.string().optional(),
  /** addEdge: target node id. */
  target: z.string().optional(),
})

type DesignAction = z.infer<typeof actionSchema>

const planSchema = z.object({
  /** A one-sentence description of what the agent is building/changing. */
  summary: z.string(),
  /** The ordered actions that realize the design. */
  actions: z.array(actionSchema),
})

type CanvasSnapshot = {
  nodes: readonly CanvasNode[]
  edges: readonly CanvasEdge[]
}

export const designAgent = task({
  id: "design-agent",
  // Non-idempotent canvas edits — never retry (see the note above).
  retry: { maxAttempts: 1 },
  run: async (payload: { prompt: string; roomId: string }) => {
    const { prompt, roomId } = payload
    logger.log("Design agent task running", { roomId })

    const client = getLiveblocks()

    // Local mirror of the shared AI state; the whole object is flushed to
    // Storage on every change so participants always see a consistent snapshot.
    let ai: GhostAiState = {
      active: true,
      thinking: true,
      phase: "thinking",
      status: "Ghost AI is interpreting your prompt…",
      cursor: null,
      feed: [],
      updatedAt: Date.now(),
    }

    const flushPresence = async () => {
      ai = { ...ai, updatedAt: Date.now() }
      try {
        await client.mutateStorage(roomId, ({ root }) => {
          root.set("ai", ai)
          // Mirror the status into the shared, schema-validated AI status feed
          // so participants' sidebars can surface it (see types/tasks.ts).
          root.set(AI_STATUS_FEED_KEY, buildStatusFeed(ai))
        })
      } catch (error) {
        // Presence is best-effort — never let a status hiccup abort the design.
        logger.warn("Failed to publish AI presence", { error: String(error) })
      }
    }

    const logActivity = (message: string, phase: GhostAiPhase = ai.phase) => {
      ai.feed = [
        ...ai.feed,
        { id: `${Date.now()}-${ai.feed.length}`, message, phase, at: Date.now() },
      ].slice(-8) // keep the feed short
    }

    try {
      logActivity(ai.status, "thinking")
      await flushPresence()

      // Give the model the current canvas so it can extend/edit rather than
      // blindly recreate. Reading through mutateFlow flushes no changes.
      const current: CanvasSnapshot = { nodes: [], edges: [] }
      try {
        await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
          const snapshot = flow.toJSON()
          ;(current as { nodes: readonly CanvasNode[] }).nodes = snapshot.nodes
          ;(current as { edges: readonly CanvasEdge[] }).edges = snapshot.edges
        })
      } catch (error) {
        logger.warn("Could not read current canvas", { error: String(error) })
      }

      // Interpret the prompt with Gemini into a concrete action plan, riding
      // out transient "high demand" overloads via retries + model fallback.
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      })
      const plan = await generatePlan(
        google,
        buildPrompt(prompt, current),
        async (note) => {
          ai.status = note
          logActivity(note, "thinking")
          await flushPresence()
        },
      )

      logger.log("Design plan generated", {
        summary: plan.summary,
        actions: plan.actions.length,
      })

      ai.phase = "processing"
      ai.status = plan.summary || "Updating the canvas…"
      logActivity(ai.status, "processing")
      await flushPresence()

      // Apply actions one at a time, moving the AI cursor to each so everyone
      // sees the agent "working" across the diagram as it takes shape.
      for (const action of plan.actions) {
        const cursor = actionCursor(action, current)
        if (cursor) {
          ai.cursor = cursor
          await flushPresence()
        }
        await applyAction(client, roomId, action)
        await sleep(180)
      }

      ai.phase = "complete"
      ai.thinking = false
      ai.cursor = null
      ai.status = "Design complete."
      logActivity(ai.status, "complete")
      await flushPresence()

      // Let the "complete" state linger briefly, then clear the AI presence so
      // the overlay fades out for everyone.
      await sleep(1600)
      ai = {
        active: false,
        thinking: false,
        phase: "complete",
        status: "",
        cursor: null,
        feed: [],
        updatedAt: Date.now(),
      }
      await flushPresence()

      return { roomId, actions: plan.actions.length }
    } catch (error) {
      logger.error("Design agent failed", { error: String(error) })
      ai.phase = "error"
      ai.thinking = false
      ai.cursor = null
      ai.status = "Something went wrong while generating your design."
      logActivity(ai.status, "error")
      await flushPresence()
      throw error
    }
  },
})

/** The plan shape returned by the model. */
type DesignPlan = z.infer<typeof planSchema>

/**
 * Generates the action plan, trying each candidate model in turn. Each model
 * gets the AI SDK's exponential-backoff retries (for transient 429/503 "high
 * demand" spikes); if a model still fails, we fall back to the next one. Throws
 * the last error only if every candidate fails.
 */
async function generatePlan(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  prompt: string,
  onFallback: (note: string) => Promise<void>,
): Promise<DesignPlan> {
  let lastError: unknown
  for (let i = 0; i < MODEL_CANDIDATES.length; i++) {
    const modelId = MODEL_CANDIDATES[i]
    try {
      if (i > 0) {
        await onFallback(`Model busy — retrying with ${modelId}…`)
      }
      const { output } = await generateText({
        model: google(modelId),
        output: Output.object({ schema: planSchema }),
        prompt,
        // Ride out transient overloads with backoff before giving up on this
        // model and falling back to the next candidate.
        maxRetries: 3,
      })
      return output
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

/** Resolves a palette pair by id, falling back to the default (first) pair. */
function palette(id: string | undefined) {
  return NODE_COLORS.find((pair) => pair.id === id) ?? NODE_COLORS[0]
}

/** Builds a canvas node from an addNode action, filling in size + color data. */
function buildNode(action: DesignAction): CanvasNode {
  const shape = (action.shape ?? "rectangle") as CanvasNodeShape
  const { width, height } = SHAPE_SIZE[shape] ?? SHAPE_SIZE.rectangle
  const pair = palette(action.color)
  return {
    id: action.id ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: CANVAS_NODE_TYPE,
    position: { x: action.x ?? 0, y: action.y ?? 0 },
    width,
    height,
    style: { width, height },
    data: {
      label: action.label ?? "",
      color: pair.background,
      textColor: pair.text,
      shape,
    },
  }
}

/** Builds a canvas edge from an addEdge action, with the shared arrowhead. */
function buildEdge(action: DesignAction): CanvasEdge | null {
  if (!action.source || !action.target) return null
  return {
    id: action.id ?? `${action.source}->${action.target}`,
    source: action.source,
    target: action.target,
    type: CANVAS_EDGE_TYPE,
    markerEnd: DEFAULT_EDGE_MARKER,
    data: { label: action.label ?? "" },
  }
}

/** Applies a single action to the collaborative canvas via the shared flow. */
async function applyAction(
  client: ReturnType<typeof getLiveblocks>,
  roomId: string,
  action: DesignAction,
) {
  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    switch (action.type) {
      case "addNode":
        flow.addNode(buildNode(action))
        break
      case "moveNode":
        if (action.id && action.x !== undefined && action.y !== undefined) {
          flow.updateNode(action.id, (node) => ({
            ...node,
            position: { x: action.x!, y: action.y! },
          }))
        }
        break
      case "resizeNode":
        if (action.id && action.width !== undefined && action.height !== undefined) {
          flow.updateNode(action.id, (node) => ({
            ...node,
            width: action.width,
            height: action.height,
            style: { ...node.style, width: action.width, height: action.height },
          }))
        }
        break
      case "updateNode": {
        if (!action.id) break
        const patch: Partial<CanvasNode["data"]> = {}
        if (action.label !== undefined) patch.label = action.label
        if (action.shape !== undefined) patch.shape = action.shape as CanvasNodeShape
        if (action.color !== undefined) {
          const pair = palette(action.color)
          patch.color = pair.background
          patch.textColor = pair.text
        }
        flow.updateNodeData(action.id, patch)
        break
      }
      case "deleteNode":
        if (action.id) flow.removeNode(action.id)
        break
      case "addEdge": {
        const edge = buildEdge(action)
        if (edge) flow.addEdge(edge)
        break
      }
      case "deleteEdge":
        if (action.id) flow.removeEdge(action.id)
        break
    }
  })
}

/**
 * Where to park the AI cursor for a given action so its presence tracks the
 * work: the target coordinate for add/move, or the target node's center for
 * edits/edges. Returns null when there's nothing sensible to point at.
 */
function actionCursor(
  action: DesignAction,
  current: CanvasSnapshot,
): { x: number; y: number } | null {
  if (
    (action.type === "addNode" || action.type === "moveNode") &&
    action.x !== undefined &&
    action.y !== undefined
  ) {
    const shape = (action.shape ?? "rectangle") as CanvasNodeShape
    const { width, height } = SHAPE_SIZE[shape] ?? SHAPE_SIZE.rectangle
    return { x: action.x + width / 2, y: action.y + height / 2 }
  }

  const targetId =
    action.type === "addEdge" ? action.target : action.id
  const node = current.nodes.find((candidate) => candidate.id === targetId)
  if (node) {
    return {
      x: node.position.x + (node.width ?? 120) / 2,
      y: node.position.y + (node.height ?? 80) / 2,
    }
  }
  return null
}

/** Builds the model prompt: design-system rules + current canvas + user ask. */
function buildPrompt(userPrompt: string, current: CanvasSnapshot): string {
  const existing =
    current.nodes.length === 0 && current.edges.length === 0
      ? "The canvas is currently empty."
      : [
          "Current canvas nodes (id, shape, label, position):",
          ...current.nodes.map(
            (node) =>
              `- ${node.id} | ${node.data.shape} | "${node.data.label}" | (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`,
          ),
          "Current edges (id, source -> target):",
          ...current.edges.map(
            (edge) => `- ${edge.id} | ${edge.source} -> ${edge.target}`,
          ),
        ].join("\n")

  return `You are Ghost AI, an assistant that designs software architecture diagrams on a collaborative canvas.

Turn the user's request into a JSON plan of canvas actions.

Allowed node shapes: ${SHAPE_IDS.join(", ")}.
Guidance: use "rectangle" or "pill" for services/components, "cylinder" for databases/stores, "hexagon" for brokers/queues, "diamond" for decisions/gateways, "circle" for start/end or events.

Allowed colors (use the palette id): ${COLOR_IDS.join(", ")}.
Group related nodes by color; keep the palette limited and consistent.

Layout & spacing rules:
- Coordinates are the node's top-left corner, in canvas units.
- Lay the diagram out with a clear flow (left-to-right or top-to-bottom).
- Leave generous spacing: at least ~220 units horizontally and ~160 units vertically between node centers. Never overlap nodes.
- Give every node a short, clear label.

Actions you may emit (one flat object each, set only the fields that apply):
- addNode: id, shape, label, color, x, y
- moveNode: id, x, y
- resizeNode: id, width, height
- updateNode: id, and any of label, shape, color
- deleteNode: id
- addEdge: id (optional), source, target
- deleteEdge: id

Rules:
- Reference existing nodes/edges by their exact ids shown below.
- For a fresh design on an empty canvas, use addNode + addEdge with new, descriptive ids (e.g. "api-gateway").
- Every edge's source and target must be an existing or newly-added node id.
- Keep the plan focused; prefer a clean diagram over an exhaustive one.

${existing}

User request: ${userPrompt}`
}

/**
 * Projects the agent's rolling activity log onto the shared AI status feed
 * ({@link AI_STATUS_FEED_KEY}). Each entry carries the current `active` flag so
 * a subscriber can tell, from the latest message alone, whether the AI is still
 * working. When the agent clears its presence the feed empties out.
 */
function buildStatusFeed(state: GhostAiState): AiStatusMessage[] {
  return state.feed.map((activity) => ({
    id: activity.id,
    text: activity.message,
    phase: activity.phase,
    active: state.active,
    at: activity.at,
  }))
}

/** Small delay so canvas edits animate in visibly rather than all at once. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
