import { auth, tasks } from "@trigger.dev/sdk"

import type { designAgent } from "@/trigger/design-agent"
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

// POST /api/ai/design — kick off a design-generation background job.
// Triggers the design task through Trigger.dev, records the run for ownership
// checks, and returns the run ID plus a run-scoped public token so the client
// can subscribe to the run in realtime (via useRealtimeRun) without a second
// round-trip to the token endpoint.
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

  const { prompt, roomId, projectId } = (body ?? {}) as {
    prompt?: unknown
    roomId?: unknown
    projectId?: unknown
  }

  if (
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    typeof roomId !== "string" ||
    typeof projectId !== "string"
  ) {
    return Response.json(
      { error: "prompt, roomId and projectId are required" },
      { status: 400 }
    )
  }

  // Only an owner or collaborator of the project may trigger a design job.
  const project = await getAccessibleProject(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    prompt,
    roomId,
  })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId: identity.userId,
    },
  })

  // Mint a read-only token scoped to just this run so the client can subscribe
  // to it with useRealtimeRun. Same scoping the standalone /token route uses.
  const publicToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [handle.id],
      },
    },
    expirationTime: "1h",
  })

  return Response.json({ runId: handle.id, publicToken })
}
