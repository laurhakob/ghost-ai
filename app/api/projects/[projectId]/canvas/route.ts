import { get, put } from "@vercel/blob"

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string }> }

/** Empty canvas payload returned when nothing has been saved yet. */
const EMPTY_CANVAS = { nodes: [], edges: [] }

// PUT /api/projects/[projectId]/canvas — persist the latest canvas JSON.
// Prisma keeps only the blob URL; the JSON itself lives in Vercel Blob.
export async function PUT(request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  // Any collaborator (owner or invited) may persist the shared canvas.
  const project = await getAccessibleProject(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { nodes?: unknown }).nodes) ||
    !Array.isArray((body as { edges?: unknown }).edges)
  ) {
    return Response.json(
      { error: "Canvas payload must include nodes and edges arrays" },
      { status: 400 }
    )
  }

  const { nodes, edges } = body as { nodes: unknown[]; edges: unknown[] }
  const json = JSON.stringify({ nodes, edges })

  // Stable pathname + overwrite so each project keeps a single canvas blob.
  // The store is private, so the JSON is read back via the authenticated
  // `get()` helper in GET rather than a public URL fetch.
  const blob = await put(`canvases/${projectId}.json`, json, {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  })

  return Response.json({ url: blob.url })
}

// GET /api/projects/[projectId]/canvas — return the saved canvas JSON.
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

  const record = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  })

  const url = record?.canvasJsonPath
  if (!url) {
    return Response.json(EMPTY_CANVAS)
  }

  // Read the canvas state from the private blob store via the authenticated
  // helper (a plain fetch of a private URL is rejected). `useCache: false`
  // guarantees the latest saved state. Any failure degrades to an empty canvas
  // rather than blocking the editor from opening.
  try {
    const result = await get(url, { access: "private", useCache: false })
    if (!result || result.statusCode !== 200) {
      return Response.json(EMPTY_CANVAS)
    }
    const data = (await new Response(result.stream).json()) as {
      nodes?: unknown
      edges?: unknown
    }
    return Response.json({
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    })
  } catch {
    return Response.json(EMPTY_CANVAS)
  }
}
