import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

/**
 * Server-side project access helpers. These read the authenticated Clerk
 * session and the database, so they must only be used from Server Components
 * or route handlers.
 */

export interface Identity {
  userId: string | null
  email: string | null
}

/** Resolve the current Clerk identity: user ID and primary email. */
export async function getCurrentIdentity(): Promise<Identity> {
  const { userId } = await auth()
  if (!userId) return { userId: null, email: null }

  const user = await currentUser()
  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null

  return { userId, email }
}

export interface AccessibleProject {
  id: string
  name: string
  ownerId: string
}

/**
 * Return the project if the given identity may access it (as owner or
 * collaborator), otherwise `null`. Non-existent projects also return `null`.
 */
export async function getAccessibleProject(
  roomId: string,
  identity: Identity
): Promise<AccessibleProject | null> {
  const { userId, email } = identity
  if (!userId) return null

  const project = await prisma.project.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: { select: { email: true } },
    },
  })

  if (!project) return null

  const isOwner = project.ownerId === userId
  const isCollaborator =
    !!email && project.collaborators.some((c) => c.email === email)

  if (!isOwner && !isCollaborator) return null

  return { id: project.id, name: project.name, ownerId: project.ownerId }
}
