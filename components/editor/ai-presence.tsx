"use client"

import { Bot, CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { useReactFlow, useViewport } from "@xyflow/react"
import { useStorage } from "@liveblocks/react/suspense"

import { GHOST_AI_COLOR, GHOST_AI_NAME, type GhostAiPhase } from "@/types/ai"

interface AiPresenceProps {
  /**
   * The canvas container. The AI cursor is computed in screen coordinates and
   * offset by this element's bounding box so it lands inside the overlay.
   */
  containerRef: React.RefObject<HTMLElement | null>
}

/**
 * Renders the design agent's shared presence and status, sourced entirely from
 * Liveblocks Storage so every participant sees the same thing. Shows an AI
 * cursor tracking the agent's work plus a floating status feed. Renders nothing
 * when the agent is idle.
 */
export function AiPresence({ containerRef }: AiPresenceProps) {
  const ai = useStorage((root) => root.ai)
  const { flowToScreenPosition } = useReactFlow()
  // Re-run cursor positioning whenever this viewer pans or zooms.
  useViewport()

  if (!ai || !ai.active) return null

  const rect = containerRef.current?.getBoundingClientRect()

  return (
    <>
      {/* AI cursor — anchored to the diagram in flow coordinates. */}
      {ai.cursor ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <AiCursor
            {...offset(flowToScreenPosition(ai.cursor), rect)}
            thinking={ai.thinking}
          />
        </div>
      ) : null}

      {/* Status feed — floating, top-center, visible to all participants. */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-background/95 px-3.5 py-2 shadow-lg backdrop-blur">
          <PhaseIcon phase={ai.phase} thinking={ai.thinking} />
          <span className="max-w-[22rem] truncate text-xs font-medium text-foreground">
            {ai.status}
          </span>
        </div>
      </div>
    </>
  )
}

/** Offsets a screen point by the overlay container's top-left corner. */
function offset(
  point: { x: number; y: number },
  rect: DOMRect | undefined,
): { x: number; y: number } {
  return {
    x: point.x - (rect?.left ?? 0),
    y: point.y - (rect?.top ?? 0),
  }
}

/** Status-feed icon reflecting the current phase. */
function PhaseIcon({
  phase,
  thinking,
}: {
  phase: GhostAiPhase
  thinking: boolean
}) {
  if (phase === "error") {
    return <TriangleAlert className="size-3.5 shrink-0 text-destructive" />
  }
  if (phase === "complete" && !thinking) {
    return <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
  }
  return (
    <Loader2
      className="size-3.5 shrink-0 animate-spin"
      style={{ color: GHOST_AI_COLOR }}
    />
  )
}

/** A pointer + labelled badge for the AI, styled like the live user cursors. */
function AiCursor({
  x,
  y,
  thinking,
}: {
  x: number
  y: number
  thinking: boolean
}) {
  return (
    <div
      className="absolute left-0 top-0 transition-transform duration-300 ease-out"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
        <path
          d="M5.5 3.5L19 11.5L12.5 12.8L9.2 18.8L5.5 3.5Z"
          fill={GHOST_AI_COLOR}
          stroke="white"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-4 top-4 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-neutral-950 shadow-sm"
        style={{ backgroundColor: GHOST_AI_COLOR }}
      >
        <Bot className={`size-3 ${thinking ? "animate-pulse" : ""}`} />
        {GHOST_AI_NAME}
      </span>
    </div>
  )
}
