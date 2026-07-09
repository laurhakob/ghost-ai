/**
 * Shared schema for the AI status feed.
 *
 * AI-powered background tasks (design generation today, spec generation later)
 * publish short status messages to a Liveblocks Storage feed named
 * {@link AI_STATUS_FEED_KEY}. Every participant subscribes to that feed and
 * shows the most recent message, so the whole room can see when the AI is
 * working. Messages are validated with {@link aiStatusMessageSchema} before
 * they are displayed — the feed lives in shared realtime state, so its contents
 * can never be fully trusted.
 */

import { z } from "zod"

/** Liveblocks Storage key holding the shared AI status feed. */
export const AI_STATUS_FEED_KEY = "ai-status-feed" as const

/** High-level phase a status message was emitted in (drives its icon/spinner). */
export const aiStatusPhaseSchema = z.enum([
  "thinking",
  "processing",
  "complete",
  "error",
])

export type AiStatusPhase = z.infer<typeof aiStatusPhaseSchema>

/**
 * A single status message on the shared AI feed. Kept intentionally generic so
 * both design and (later) spec generation can publish to the same feed. `text`
 * is optional — a message may carry only a phase/active flag.
 */
export const aiStatusMessageSchema = z.object({
  /** Stable id for React keys / de-duplication. */
  id: z.string(),
  /** Optional human-readable status text shown to participants. */
  text: z.string().optional(),
  /** Phase this message was emitted in. */
  phase: aiStatusPhaseSchema.optional(),
  /** Whether the AI is actively working (drives the sidebar's busy state). */
  active: z.boolean().optional(),
  /** Emit time (ms epoch). */
  at: z.number().optional(),
})

export type AiStatusMessage = z.infer<typeof aiStatusMessageSchema>

/**
 * Validates the latest raw feed entry before it is displayed. Returns the
 * parsed message, or `null` when the entry is missing or malformed.
 */
export function parseAiStatusMessage(value: unknown): AiStatusMessage | null {
  const result = aiStatusMessageSchema.safeParse(value)
  return result.success ? result.data : null
}

// --- Collaborative room chat (`ai-chat` feed) ---
//
// A room-scoped, human-to-human chat kept in a separate Liveblocks Storage feed
// from `ai-status-feed`: this one carries chat messages, that one carries AI
// progress/presence. The two are never mixed.

/** Liveblocks Storage key holding the shared room chat feed. */
export const AI_CHAT_KEY = "ai-chat" as const

/** Who authored a message. Only "user" is used today (no AI replies yet). */
export const aiChatRoleSchema = z.enum(["user", "assistant"])

export type AiChatRole = z.infer<typeof aiChatRoleSchema>

/** The participant who sent a chat message (mirrors Liveblocks UserMeta.info). */
export const aiChatSenderSchema = z.object({
  /** Stable user id (from Clerk, via the Liveblocks auth session). */
  id: z.string(),
  /** Display name shown beside the message. */
  name: z.string(),
  /** Deterministic presence color, used to tint the sender label. */
  color: z.string().optional(),
  /** Avatar image URL, when available. */
  avatar: z.string().optional(),
})

export type AiChatSender = z.infer<typeof aiChatSenderSchema>

/**
 * A single room chat message. Carries the sender, role, content, and a
 * timestamp. Validated with {@link parseAiChatMessage} before rendering, since
 * the feed lives in shared realtime state.
 */
export const aiChatMessageSchema = z.object({
  /** Stable id for React keys / de-duplication. */
  id: z.string(),
  /** Who sent the message. */
  sender: aiChatSenderSchema,
  /** Author role — "user" for participants (AI replies not added yet). */
  role: aiChatRoleSchema,
  /** The message text. */
  content: z.string(),
  /** Send time (ms epoch). */
  at: z.number(),
})

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>

/**
 * Validates a raw chat feed entry before it is displayed. Returns the parsed
 * message, or `null` when the entry is missing or malformed.
 */
export function parseAiChatMessage(value: unknown): AiChatMessage | null {
  const result = aiChatMessageSchema.safeParse(value)
  return result.success ? result.data : null
}
