"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { CanvasShape } from "@/components/editor/canvas-shape"
import type { CanvasNode } from "@/types/canvas"

/**
 * Renderer for the custom canvas node. Delegates the visual to {@link CanvasShape}
 * so each node draws its correct shape variant (CSS for rectangle/pill/circle,
 * SVG for diamond/hexagon/cylinder), then overlays connection handles on all
 * four sides for loose connections. Stays driven by the synced node data.
 */
export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  return (
    <div className="h-full w-full">
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />

      <CanvasShape
        shape={data.shape}
        color={data.color}
        selected={selected}
        label={data.label}
      />
    </div>
  )
}
