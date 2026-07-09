import { get } from "@vercel/blob"

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ projectId: string; specId: string }>
}

// GET /api/projects/[projectId]/specs/[specId]/download — download a generated
// spec as a Markdown attachment. The Markdown itself lives in the private
// Vercel Blob store (Prisma holds only metadata), so it is read back through
// the authenticated `get()` helper and only after access + ownership checks.
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, specId } = await params

  // Only an owner or collaborator of the project may download its specs.
  const project = await getAccessibleProject(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // The spec must exist AND belong to this project — never serve a spec by id
  // alone, or one project could reach another's file.
  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
    select: { projectId: true, filePath: true },
  })

  if (!spec || spec.projectId !== projectId) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Read the Markdown from the private blob store via the authenticated helper
  // (a plain fetch of a private URL is rejected). `useCache: false` guarantees
  // the saved content.
  let markdown: string
  try {
    const result = await get(spec.filePath, {
      access: "private",
      useCache: false,
    })
    if (!result || result.statusCode !== 200) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    markdown = await new Response(result.stream).text()
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
    },
  })
}
