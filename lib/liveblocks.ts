import { Liveblocks } from "@liveblocks/node"

/**
 * Cached Liveblocks node client. The client is created lazily on first use and
 * reused across requests (and hot reloads in development). Lazy construction
 * matters because the `Liveblocks` constructor validates the secret key
 * eagerly, which would otherwise fail during the build's page-data collection.
 */
const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

export function getLiveblocks(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    })
  }
  return globalForLiveblocks.liveblocks
}

/**
 * A fixed palette of cursor colors. Users are mapped deterministically into
 * this palette so a given user always renders with the same color.
 */
const CURSOR_COLORS = [
  "#E57373", // red
  "#F06292", // pink
  "#BA68C8", // purple
  "#7986CB", // indigo
  "#64B5F6", // blue
  "#4DB6AC", // teal
  "#81C784", // green
  "#FFB74D", // orange
  "#A1887F", // brown
  "#4FC3F7", // light blue
] as const

/**
 * Deterministically map a user ID to a consistent color from {@link
 * CURSOR_COLORS}. The same ID always yields the same color.
 */
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0 // force 32-bit integer
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length
  return CURSOR_COLORS[index]
}
