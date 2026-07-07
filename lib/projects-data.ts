import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { slugify, type Project } from "@/lib/projects"

/**
 * Server-side project data helper.
 *
 * These functions read directly from the database using the authenticated
 * Clerk session and are intended for use in Server Components. They map Prisma
 * rows to the UI `Project` shape (deriving the display slug from the name).
 */

interface ProjectRow {
  id: string
  name: string
}

function toUiProject(row: ProjectRow, owned: boolean): Project {
  return {
    id: row.id,
    name: row.name,
    slug: slugify(row.name),
    owned,
  }
}

/** Projects owned by the current user, newest first. */
export async function getOwnedProjects(): Promise<Project[]> {
  const { userId } = await auth()
  if (!userId) return []

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return projects.map((p) => toUiProject(p, true))
}

/** Projects shared with the current user (as a collaborator), newest first. */
export async function getSharedProjects(): Promise<Project[]> {
  const { userId } = await auth()
  if (!userId) return []

  const user = await currentUser()
  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user?.emailAddresses[0]?.emailAddress
  if (!email) return []

  const projects = await prisma.project.findMany({
    where: {
      ownerId: { not: userId },
      collaborators: { some: { email } },
    },
    orderBy: { createdAt: "desc" },
  })

  return projects.map((p) => toUiProject(p, false))
}
