/**
 * Shared types for the Ghost AI design agent's presence + status feed.
 *
 * The agent runs as a Trigger.dev background task with no Liveblocks presence
 * connection of its own, so it publishes its cursor, thinking state, and status
 * feed into Liveblocks Storage (under the `ai` key). Storage syncs to every
 * participant, which is what makes the AI presence + status visible to all.
 */

/** High-level phase the design agent is in, surfaced in the shared status feed. */
export type GhostAiPhase = "thinking" | "processing" | "complete" | "error"

/**
 * A single entry in the shared AI status feed.
 *
 * Declared as a `type` (not an `interface`) so it carries an implicit index
 * signature and stays assignable to Liveblocks' `Json`/`Lson` Storage value.
 */
export type GhostAiActivity = {
  /** Stable id for React keys. */
  id: string
  /** Human-readable status message. */
  message: string
  /** Phase this message was emitted in (drives its icon/color). */
  phase: GhostAiPhase
  /** Emit time (ms epoch). */
  at: number
}

/**
 * The design agent's shared presence + status. Stored in Liveblocks Storage
 * under the `ai` key so every participant in the room sees the same live state.
 * Kept as plain JSON (not a LiveObject) because the agent rewrites the whole
 * object atomically on each update.
 */
export type GhostAiState = {
  /** Whether the agent is currently working in this room (drives visibility). */
  active: boolean
  /** Whether the agent is thinking (drives the pulsing presence indicator). */
  thinking: boolean
  /** Current high-level phase. */
  phase: GhostAiPhase
  /** Latest human-readable status message. */
  status: string
  /** Agent cursor position in flow (canvas) coordinates, or null when idle. */
  cursor: { x: number; y: number } | null
  /** Rolling status feed shown to all participants (most recent last). */
  feed: GhostAiActivity[]
  /** Last update time (ms epoch). */
  updatedAt: number
}

/** Display name shown on the AI cursor and status feed. */
export const GHOST_AI_NAME = "Ghost AI"

/** Cyan accent used for the AI cursor + status chrome (matches the AI brand). */
export const GHOST_AI_COLOR = "#22D3EE"
