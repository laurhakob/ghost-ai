import { auth } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

// GET /api/projects — list the current user's projects.
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(projects)
}

// POST /api/projects — create a project owned by the current user.
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    // No/invalid JSON body — fall back to defaults below.
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}

  const rawName = record.name
  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : "Untitled Project"

  // An explicit `id` keeps the project ID aligned with the Liveblocks room ID.
  // When omitted, the schema's default cuid strategy is used.
  const rawId = record.id
  const id =
    typeof rawId === "string" && rawId.trim().length > 0
      ? rawId.trim()
      : undefined

  const project = await prisma.project.create({
    data: { ...(id ? { id } : {}), ownerId: userId, name },
  })

  return Response.json(project, { status: 201 })
}
