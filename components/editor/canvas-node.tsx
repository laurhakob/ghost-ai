"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"

import { CanvasShape } from "@/components/editor/canvas-shape"
import { NodeColorToolbar } from "@/components/editor/node-color-toolbar"
import type { CanvasNode } from "@/types/canvas"

/** Smallest a node may be resized to (canvas units), keeping shapes legible. */
const MIN_NODE_SIZE = 48

/**
 * Renderer for the custom canvas node. Delegates the visual to {@link CanvasShape}
 * so each node draws its correct shape variant (CSS for rectangle/pill/circle,
 * SVG for diamond/hexagon/cylinder), overlays connection handles on all four
 * sides, and adds two editing affordances on top:
 *
 *  - a {@link NodeResizer} (visible only while selected) for drag-to-resize, with
 *    a minimum size and subtle, dark-canvas-consistent handles.
 *  - inline label editing: double-click opens a centered textarea directly over
 *    the label, commits on blur, and cancels on `Escape`.
 *
 * Both resize and label edits flow through React Flow's node-change pipeline
 * (`onNodesChange` — resizing dispatches dimension changes, `updateNodeData`
 * dispatches a replace change), which is the same pipeline Liveblocks syncs, so
 * everyone in the room stays in sync.
 */
export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode>()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [hovered, setHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handles stay hidden until the node is hovered, then fade in. They remain
  // connectable while invisible, so nothing changes about connection behavior.
  const handleStyle: CSSProperties = {
    width: 8,
    height: 8,
    background: "#ffffff",
    border: "1px solid #0a0a0a",
    opacity: hovered ? 1 : 0,
    transition: "opacity 120ms ease",
  }

  // Mirror remote label edits into the draft whenever we're not actively editing.
  useEffect(() => {
    if (!editing) setDraft(data.label)
  }, [data.label, editing])

  // Collapse the textarea's height to its content so the flex parent can keep
  // the text vertically centered (a fixed-row textarea leaves the box taller
  // than the text, which pins the text to the top instead of the middle).
  const autoSize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  // Focus, select, and size the text as soon as editing starts.
  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    el?.focus()
    el?.select()
    autoSize()
  }, [editing])

  const startEditing = () => {
    setDraft(data.label)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== data.label) updateNodeData(id, { label: draft })
  }

  const cancel = () => {
    setDraft(data.label)
    setEditing(false)
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NodeColorToolbar
        nodeId={id}
        isVisible={selected}
        activeBackground={data.color}
      />

      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        color="#525252"
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: "rgba(82, 82, 82, 0.6)" }}
      />

      <Handle type="source" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} />

      {/* The shape draws the label itself when idle; hide it while editing so the
          textarea sits alone in the same centered spot (no layout shift). */}
      <CanvasShape
        shape={data.shape}
        background={data.color}
        textColor={data.textColor}
        selected={selected}
        label={editing ? "" : data.label}
      />

      {/* Editing surface, pinned over the label. Double-click anywhere on the
          node opens editing; the placeholder occupies the same centered slot. */}
      <div
        className="absolute inset-0 flex items-center justify-center px-3"
        onDoubleClick={startEditing}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            onChange={(event) => {
              setDraft(event.target.value)
              autoSize()
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                cancel()
              }
            }}
            // `nodrag`/`nopan` keep text selection and caret placement from
            // dragging the node or panning the canvas.
            className="nodrag nopan block w-full resize-none overflow-hidden bg-transparent text-center text-sm leading-tight outline-none"
            style={{ color: data.textColor }}
          />
        ) : data.label ? null : (
          <span className="pointer-events-none truncate text-center text-sm text-neutral-600">
            Double-click to add label
          </span>
        )}
      </div>
    </div>
  )
}
