import { auth } from "@clerk/nextjs/server"

import { enrichCollaborators } from "@/lib/collaborators"
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string }> }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Read and normalize an `email` field from a JSON request body. */
async function readEmail(request: Request): Promise<string> {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    // No/invalid JSON body.
  }

  const raw =
    body && typeof body === "object" && "email" in body
      ? (body as { email?: unknown }).email
      : undefined

  return typeof raw === "string" ? raw.trim().toLowerCase() : ""
}

/**
 * Load a project and confirm the current user owns it. Returns a `Response`
 * to short-circuit with on any failure, or the owner's `userId` on success.
 */
async function requireOwner(
  projectId: string
): Promise<{ error: Response } | { userId: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return { error: Response.json({ error: "Not found" }, { status: 404 }) }
  }
  if (project.ownerId !== userId) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId }
}

// GET — list collaborators. Any user with access (owner or collaborator) may
// view the list; the response also reports whether the caller is the owner.
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await getAccessibleProject(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  })

  const collaborators = await enrichCollaborators(rows.map((r) => r.email))

  return Response.json({
    collaborators,
    isOwner: project.ownerId === identity.userId,
  })
}

// POST — invite a collaborator by email (owner only).
export async function POST(request: Request, { params }: RouteContext) {
  const { projectId } = await params

  const guard = await requireOwner(projectId)
  if ("error" in guard) return guard.error

  const email = await readEmail(request)
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json(
      { error: "A valid email is required" },
      { status: 400 }
    )
  }

  // Idempotent invite — re-inviting an existing collaborator is a no-op.
  await prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    create: { projectId, email },
    update: {},
  })

  const [collaborator] = await enrichCollaborators([email])
  return Response.json(collaborator, { status: 201 })
}

// DELETE — remove a collaborator by email (owner only).
export async function DELETE(request: Request, { params }: RouteContext) {
  const { projectId } = await params

  const guard = await requireOwner(projectId)
  if ("error" in guard) return guard.error

  const email = await readEmail(request)
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 })
  }

  await prisma.projectCollaborator.deleteMany({ where: { projectId, email } })

  return new Response(null, { status: 204 })
}
