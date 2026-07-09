import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string }> }

// GET /api/projects/[projectId]/specs — list the generated specs for a project.
// Returns metadata only (id + createdAt); the Markdown content lives in the
// private Vercel Blob store and is fetched separately through the per-spec
// download route. Access is gated by the same owner/collaborator check used
// everywhere else.
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

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ specs })
}
