import { currentUser } from "@clerk/nextjs/server"

import { getLiveblocks, getUserColor } from "@/lib/liveblocks"
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"

// POST /api/liveblocks-auth — authenticate a Liveblocks session.
//
// The project ID doubles as the Liveblocks room ID. We authenticate with
// Clerk, verify project access with our own helper, ensure the room exists,
// and issue a session token carrying the user's name, avatar, and cursor color.
export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Liveblocks sends the room it wants to enter; the room ID is the project ID.
  let room: string | undefined
  try {
    const body = (await request.json()) as { room?: unknown }
    if (typeof body.room === "string") room = body.room
  } catch {
    // No/invalid JSON body.
  }

  if (!room) {
    return new Response("Missing room", { status: 400 })
  }

  // Verify project access using the existing access helper.
  const project = await getAccessibleProject(room, identity)
  if (!project) {
    return new Response("Forbidden", { status: 403 })
  }

  const liveblocks = getLiveblocks()

  // Ensure the Liveblocks room exists (created only if it doesn't already).
  await liveblocks.getOrCreateRoom(room, { defaultAccesses: [] })

  // Resolve display info from Clerk for the session token.
  const user = await currentUser()
  const name =
    user?.fullName?.trim() ||
    identity.email ||
    "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = getUserColor(identity.userId)

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: { name, avatar, color },
  })
  session.allow(room, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
