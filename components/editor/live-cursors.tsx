"use client"

import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import { useReactFlow, useViewport } from "@xyflow/react"
import { useOthers } from "@liveblocks/react/suspense"

/** Fallback color used if a participant somehow has no presence color. */
const FALLBACK_COLOR = "#64B5F6"

interface LiveCursorsProps {
  /**
   * The canvas container. Cursor positions are computed in client (screen)
   * coordinates and offset by this element's bounding box so they land at the
   * right spot inside the absolutely-positioned overlay.
   */
  containerRef: React.RefObject<HTMLElement | null>
}

/**
 * Renders live cursors for the other participants in the room. Cursor
 * positions travel through Liveblocks presence in canvas (flow) coordinates,
 * so they stay anchored to the diagram as each viewer pans and zooms
 * independently. The current user's own cursor is never drawn.
 */
export function LiveCursors({ containerRef }: LiveCursorsProps) {
  const { user } = useUser()
  const others = useOthers()
  const { flowToScreenPosition } = useReactFlow()
  // Re-run positioning whenever this viewer pans or zooms.
  useViewport()

  const rect = containerRef.current?.getBoundingClientRect()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {others.map((other) => {
        const cursor = other.presence.cursor
        if (!cursor) return null
        // Never render the current user's cursor, even across their own tabs.
        if (user && other.id === user.id) return null

        const screen = flowToScreenPosition(cursor)
        const x = screen.x - (rect?.left ?? 0)
        const y = screen.y - (rect?.top ?? 0)
        const color = other.info?.color ?? FALLBACK_COLOR
        const name = other.info?.name ?? "Anonymous"
        // Show a spinner in the badge while this participant is prompting the AI.
        const thinking = other.presence.thinking === true

        return (
          <Cursor
            key={other.connectionId}
            x={x}
            y={y}
            color={color}
            name={name}
            thinking={thinking}
          />
        )
      })}
    </div>
  )
}

interface CursorProps {
  x: number
  y: number
  color: string
  name: string
  /** Whether this participant is currently prompting the AI (shows a spinner). */
  thinking: boolean
}

/** A single colored pointer with a name badge attached. */
function Cursor({ x, y, color, name, thinking }: CursorProps) {
  return (
    <div
      className="absolute left-0 top-0"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block" }}
      >
        <path
          d="M5.5 3.5L19 11.5L12.5 12.8L9.2 18.8L5.5 3.5Z"
          fill={color}
          stroke="white"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-4 top-4 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {thinking ? <Loader2 className="size-3 shrink-0 animate-spin" /> : null}
        {name}
      </span>
    </div>
  )
}
