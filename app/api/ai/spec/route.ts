import { tasks } from "@trigger.dev/sdk"

import type { GenerateSpecInput, generateSpec } from "@/trigger/generate-spec"
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

// POST /api/ai/spec — kick off an AI spec-generation background job.
// Triggers the `generate-spec` task from the current canvas + chat context,
// records the run for ownership/access checks, and returns the Trigger.dev run
// ID so the client can subscribe to it (after minting a token via /spec/token).
//
// Project access is derived from the authenticated user + roomId — the room ID
// IS the project ID in this app. A client-supplied projectId is never trusted.
export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { roomId, chatHistory, nodes, edges } = (body ?? {}) as {
    roomId?: unknown
    chatHistory?: unknown
    nodes?: unknown
    edges?: unknown
  }

  if (typeof roomId !== "string" || roomId.length === 0) {
    return Response.json({ error: "roomId is required" }, { status: 400 })
  }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return Response.json(
      { error: "nodes and edges must be arrays" },
      { status: 400 },
    )
  }
  if (chatHistory !== undefined && !Array.isArray(chatHistory)) {
    return Response.json(
      { error: "chatHistory must be an array" },
      { status: 400 },
    )
  }

  // Resolve project access from the room ID + authenticated user only. Only an
  // owner or collaborator may generate a spec. The resolved project id is the
  // trusted projectId passed downstream (never a client-provided one).
  const project = await getAccessibleProject(roomId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // The task re-validates every field with Zod, so pass the raw client arrays
  // through as the (trusted-shape-at-runtime) task input.
  const payload = {
    projectId: project.id,
    roomId,
    chatHistory: chatHistory ?? [],
    nodes,
    edges,
  } as GenerateSpecInput

  const handle = await tasks.trigger<typeof generateSpec>(
    "generate-spec",
    payload,
  )

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId: identity.userId,
    },
  })

  return Response.json({ runId: handle.id })
}
