"use client"

import { useEffect, useRef, useState } from "react"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"

import type { CanvasEdge } from "@/types/canvas"

/** Stroke color for the edge line, shared by rest and active states. */
const EDGE_STROKE = "#94a3b8"
/** Constant visible line thickness — hover/select brighten, they don't thicken. */
const EDGE_STROKE_WIDTH = 2
/** Radius of the right-angle corners produced by `getSmoothStepPath`. */
const EDGE_CORNER_RADIUS = 8

/**
 * Custom canvas edge. Routes with clean right angles (`getSmoothStepPath`),
 * stays slightly dimmed at rest, and brightens when hovered or selected. A wide
 * invisible interaction band (`interactionWidth`) makes the edge easy to hover
 * and click without thickening the visible line.
 *
 * Double-clicking opens an inline label editor positioned at the path midpoint
 * via {@link EdgeLabelRenderer} (using the `labelX`/`labelY` from
 * `getSmoothStepPath` — never a hand-computed midpoint). The label commits on
 * blur, Enter, or Escape through `updateEdgeData`, which flows through the same
 * `onEdgesChange` pipeline Liveblocks syncs, so labels stay collaborative.
 */
export function CanvasEdgeRenderer({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData } = useReactFlow<never, CanvasEdge>()

  const label = typeof data?.label === "string" ? data.label : ""
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mirror remote label edits into the draft whenever we're not actively editing.
  useEffect(() => {
    if (!editing) setDraft(label)
  }, [label, editing])

  // Focus and select the text as soon as editing starts.
  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    el?.focus()
    el?.select()
  }, [editing])

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_CORNER_RADIUS,
  })

  const active = selected || hovered

  const startEditing = () => {
    setDraft(label)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== label) updateEdgeData(id, { label: draft })
  }

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        onDoubleClick={startEditing}
        style={{
          stroke: EDGE_STROKE,
          strokeWidth: EDGE_STROKE_WIDTH,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          // Dimmed at rest, bright when hovered or selected.
          opacity: active ? 1 : 0.45,
          transition: "opacity 120ms ease",
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          onDoubleClick={startEditing}
          // Positioned at the path midpoint reported by getSmoothStepPath.
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            // EdgeLabelRenderer's container is non-interactive; opt this label in.
            pointerEvents: "all",
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                  event.preventDefault()
                  // Blur triggers commit; save on blur, Enter, or Escape.
                  inputRef.current?.blur()
                }
              }}
              // Stop text interactions from dragging the edge or panning canvas.
              onPointerDown={(event) => event.stopPropagation()}
              // Grow the input with its text (min 1ch so an empty field is usable).
              style={{ width: `${Math.max(draft.length, 1)}ch` }}
              className="nodrag nopan rounded-full border border-white/20 bg-neutral-900 px-2 py-0.5 text-center text-xs text-neutral-100 outline-none"
            />
          ) : label ? (
            <span className="rounded-full border border-white/10 bg-neutral-900/90 px-2 py-0.5 text-xs text-neutral-200 shadow-sm backdrop-blur">
              {label}
            </span>
          ) : active ? (
            <span className="rounded-full px-2 py-0.5 text-xs text-neutral-500">
              Double-click to label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </g>
  )
}
