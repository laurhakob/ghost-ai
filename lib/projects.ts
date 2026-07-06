export interface Project {
  id: string
  name: string
  slug: string
  /** Whether the current user owns this project. Collaborator projects are shared. */
  owned: boolean
}

/**
 * Derive a URL-friendly slug from a project name.
 * Lowercases, strips non-alphanumeric characters, and collapses whitespace
 * and separators into single hyphens.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Mock project data — no persistence yet. */
export const mockProjects: Project[] = [
  { id: "1", name: "Payments Platform", slug: "payments-platform", owned: true },
  { id: "2", name: "Realtime Analytics", slug: "realtime-analytics", owned: true },
  { id: "3", name: "Internal Design System", slug: "internal-design-system", owned: true },
]

/** Mock projects shared with the current user by other people. */
export const mockSharedProjects: Project[] = [
  { id: "4", name: "Growth Experiments", slug: "growth-experiments", owned: false },
  { id: "5", name: "Billing Migration", slug: "billing-migration", owned: false },
]
