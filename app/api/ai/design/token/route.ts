import { auth } from "@trigger.dev/sdk"

import { getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

// POST /api/ai/design/token — mint a run-scoped Trigger.dev public token.
// Verifies the caller owns the run (via the TaskRun record) before issuing a
// read-only token the client can use to subscribe to that specific run.
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

  const { runId } = (body ?? {}) as { runId?: unknown }
  if (typeof runId !== "string" || runId.length === 0) {
    return Response.json({ error: "runId is required" }, { status: 400 })
  }

  // Ownership check: the run must belong to the authenticated user.
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: { userId: true },
  })

  if (!taskRun || taskRun.userId !== identity.userId) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const publicToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: "1h",
  })

  return Response.json({ token: publicToken })
}
