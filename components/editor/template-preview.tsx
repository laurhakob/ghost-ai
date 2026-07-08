"use client"

import { CanvasShape } from "@/components/editor/canvas-shape"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { EDGE_STROKE_COLOR } from "@/types/canvas"

/** Fixed logical viewport the diagram is scaled to fit into. */
const PREVIEW_WIDTH = 260
const PREVIEW_HEIGHT = 120
/** Fraction of the viewport the diagram fills, leaving a small margin. */
const PREVIEW_PADDING = 0.85

interface TemplatePreviewProps {
  template: CanvasTemplate
}

/**
 * A lightweight, static diagram preview — no React Flow instance. Bounds are
 * derived from the template's node positions/sizes, then everything is scaled
 * to fit a fixed-size viewport and centered. Edges are drawn as simple lines
 * between node centers; nodes reuse {@link CanvasShape} so they show the same
 * shape and color as on the real canvas.
 */
export function TemplatePreview({ template }: TemplatePreviewProps) {
  const { nodes, edges } = template

  // Content bounds from node positions + sizes.
  const minX = Math.min(...nodes.map((n) => n.position.x))
  const minY = Math.min(...nodes.map((n) => n.position.y))
  const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width ?? 0)))
  const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height ?? 0)))

  const contentWidth = Math.max(maxX - minX, 1)
  const contentHeight = Math.max(maxY - minY, 1)

  const scale =
    Math.min(PREVIEW_WIDTH / contentWidth, PREVIEW_HEIGHT / contentHeight) *
    PREVIEW_PADDING

  // Offsets that center the scaled diagram within the viewport.
  const offsetX = (PREVIEW_WIDTH - contentWidth * scale) / 2
  const offsetY = (PREVIEW_HEIGHT - contentHeight * scale) / 2

  const toViewport = (x: number, y: number) => ({
    x: (x - minX) * scale + offsetX,
    y: (y - minY) * scale + offsetY,
  })

  const centerOf = (id: string) => {
    const n = nodes.find((node) => node.id === id)
    if (!n) return null
    return toViewport(
      n.position.x + (n.width ?? 0) / 2,
      n.position.y + (n.height ?? 0) / 2,
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/10 bg-neutral-950"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    >
      {/* Edge lines between node centers, behind the nodes. */}
      <svg
        className="absolute inset-0"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
      >
        {edges.map((edge) => {
          const from = centerOf(edge.source)
          const to = centerOf(edge.target)
          if (!from || !to) return null
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={EDGE_STROKE_COLOR}
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          )
        })}
      </svg>

      {/* Nodes drawn with their real shape + color. */}
      {nodes.map((node) => {
        const { x, y } = toViewport(node.position.x, node.position.y)
        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: x,
              top: y,
              width: (node.width ?? 0) * scale,
              height: (node.height ?? 0) * scale,
            }}
          >
            <CanvasShape
              shape={node.data.shape}
              background={node.data.color}
              textColor={node.data.textColor}
            />
          </div>
        )
      })}
    </div>
  )
}
