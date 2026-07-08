"use client"

import { CanvasShape } from "@/components/editor/canvas-shape"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { EDGE_STROKE_COLOR } from "@/types/canvas"

/**
 * Logical viewport the diagram is scaled to fit. The preview renders at whatever
 * width the card gives it, keeping this aspect ratio, so nodes stay large and
 * legible instead of squeezing into a small fixed box.
 */
const VIEW_WIDTH = 340
const VIEW_HEIGHT = 190
/** Fraction of the viewport the diagram fills, leaving a comfortable margin. */
const PREVIEW_PADDING = 0.82

interface TemplatePreviewProps {
  template: CanvasTemplate
}

/**
 * A lightweight, static diagram preview — no React Flow instance. Bounds are
 * derived from the template's node positions/sizes, then everything is scaled
 * to fit the logical viewport and centered. The whole thing renders responsively
 * (percentages of a fixed aspect ratio) so it fills the card. Edges are drawn as
 * simple lines between node centers; nodes reuse {@link CanvasShape} so they show
 * the same shape and color as on the real canvas.
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
    Math.min(VIEW_WIDTH / contentWidth, VIEW_HEIGHT / contentHeight) *
    PREVIEW_PADDING

  // Offsets that center the scaled diagram within the viewport.
  const offsetX = (VIEW_WIDTH - contentWidth * scale) / 2
  const offsetY = (VIEW_HEIGHT - contentHeight * scale) / 2

  // Map a canvas point into the logical viewport (0..VIEW_WIDTH, 0..VIEW_HEIGHT).
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

  // Percentages keep the layout responsive while matching the SVG's aspect ratio.
  const pctX = (x: number) => `${(x / VIEW_WIDTH) * 100}%`
  const pctY = (y: number) => `${(y / VIEW_HEIGHT) * 100}%`

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-neutral-950"
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      {/* Edge lines between node centers, behind the nodes. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
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
              strokeWidth={1.5}
              strokeOpacity={0.7}
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
              left: pctX(x),
              top: pctY(y),
              width: pctX((node.width ?? 0) * scale),
              height: pctY((node.height ?? 0) * scale),
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
