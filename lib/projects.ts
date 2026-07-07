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

/** Generate a short, reasonably unique suffix for room IDs. */
export function generateRoomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Build a Liveblocks room ID from a project name: the slug plus a short unique
 * suffix. This value is also used as the project ID so the two stay aligned.
 */
export function buildRoomId(name: string, suffix: string): string {
  const slug = slugify(name)
  return slug ? `${slug}-${suffix}` : suffix
}
