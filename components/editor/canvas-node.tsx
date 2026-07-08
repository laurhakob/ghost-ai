"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import type { CanvasNode } from "@/types/canvas"

/**
 * Basic renderer for the custom canvas node. For this unit every shape renders
 * as a simple bordered rectangle with its label centered — shape-specific
 * visuals come later. Fills the node box sized by the drop handler.
 */
export function CanvasNodeRenderer({ data }: NodeProps<CanvasNode>) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md border-2 bg-neutral-900/80 px-3 text-center text-sm text-neutral-100"
      style={{ borderColor: data.color }}
    >
      {/* Connection handles on all four sides for loose connections. */}
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />

      <span className="pointer-events-none truncate">{data.label}</span>
    </div>
  )
}
