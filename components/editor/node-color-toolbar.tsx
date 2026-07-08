"use client"

import { useState } from "react"

import { NodeToolbar, Position, useReactFlow } from "@xyflow/react"

import { cn } from "@/lib/utils"
import {
  NODE_COLORS,
  type CanvasNode,
  type NodeColorPair,
} from "@/types/canvas"

interface NodeColorToolbarProps {
  /** Node this toolbar controls. */
  nodeId: string
  /** Only shown while the node is selected. */
  isVisible: boolean
  /** Current node background color, used to highlight the active swatch. */
  activeBackground: string
}

/**
 * A small floating toolbar rendered just above a selected node offering one
 * swatch per predefined {@link NODE_COLORS} pair. Selecting a swatch updates the
 * node's background and paired text color through React Flow's node-change flow
 * (which Liveblocks syncs) — no server calls. `nodrag`/`nopan` and swatch-level
 * `stopPropagation` keep toolbar interactions from dragging the node or panning
 * the canvas.
 */
export function NodeColorToolbar({
  nodeId,
  isVisible,
  activeBackground,
}: NodeColorToolbarProps) {
  const { updateNodeData } = useReactFlow<CanvasNode>()

  return (
    <NodeToolbar
      isVisible={isVisible}
      position={Position.Top}
      offset={12}
      className="nodrag nopan flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-900/95 px-2 py-1.5 shadow-lg shadow-black/40 backdrop-blur"
    >
      {NODE_COLORS.map((pair) => (
        <Swatch
          key={pair.id}
          pair={pair}
          active={pair.background === activeBackground}
          onSelect={() =>
            updateNodeData(nodeId, { color: pair.background, textColor: pair.text })
          }
        />
      ))}
    </NodeToolbar>
  )
}

interface SwatchProps {
  pair: NodeColorPair
  active: boolean
  onSelect: () => void
}

/**
 * A single color-pair swatch: fills with the pair's background and shows a glyph
 * in its text color so both colors read at a glance. The active pair gets a
 * bright ring; hovering adds a tight glow tinted with the text color.
 */
function Swatch({ pair, active, onSelect }: SwatchProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      aria-label={`Set ${pair.id} color`}
      aria-pressed={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Stop the pointer/click from reaching React Flow's node drag handler.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className={cn(
        "flex size-6 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors",
        active
          ? "border-white/70 ring-1 ring-white/70"
          : "border-white/10 hover:border-white/30",
      )}
      style={{
        background: pair.background,
        color: pair.text,
        // Tight, controlled glow (small blur, no spread) tinted by the text color.
        boxShadow: hovered ? `0 0 6px 0 ${pair.text}` : undefined,
      }}
    >
      A
    </button>
  )
}
