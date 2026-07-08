"use client"

import type { CanvasNodeShape } from "@/types/canvas"

/** Node fill — matches the dark canvas surface (neutral-900 at 80%). */
const SHAPE_FILL = "rgba(23, 23, 23, 0.8)"

/** Shapes drawn with SVG so they can stretch to arbitrary node sizes. */
const SVG_SHAPES = new Set<CanvasNodeShape>(["diamond", "hexagon", "cylinder"])

/**
 * Appends an 8-bit alpha channel to a `#RRGGBB` color. Non-hex colors are
 * returned untouched so callers can pass any CSS color safely.
 */
function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color
}

interface CanvasShapeProps {
  shape: CanvasNodeShape
  /** Accent color used for the border/stroke. */
  color: string
  /** Brightens the border and adds a glow when the node is selected. */
  selected?: boolean
  /** Optional centered label. */
  label?: string
}

/**
 * Renders a single canvas shape, filling its container. Rectangle, pill, and
 * circle are plain CSS boxes (border-radius does the work); diamond, hexagon,
 * and cylinder are SVGs that stretch with the node via `preserveAspectRatio`
 * while keeping a constant stroke width (`vectorEffect="non-scaling-stroke"`).
 *
 * Borders stay subtle at rest and brighten (plus a soft glow) when selected.
 * Shared by the node renderer and the shape-panel drag preview so both always
 * draw the same thing.
 */
export function CanvasShape({ shape, color, selected, label }: CanvasShapeProps) {
  const stroke = selected ? color : withAlpha(color, "80")
  const strokeWidth = selected ? 2.5 : 2
  const isSvg = SVG_SHAPES.has(shape)

  return (
    <div
      className="relative h-full w-full"
      style={
        selected
          ? { filter: `drop-shadow(0 0 6px ${withAlpha(color, "aa")})` }
          : undefined
      }
    >
      {isSvg ? (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {shape === "diamond" && (
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={SHAPE_FILL}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {shape === "hexagon" && (
            <polygon
              points="25,3 75,3 98,50 75,97 25,97 2,50"
              fill={SHAPE_FILL}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {shape === "cylinder" && (
            <>
              {/* Body fill, from the top ellipse's front edge to the bottom. */}
              <path
                d="M2,14 A48,12 0 0 0 98,14 L98,86 A48,12 0 0 0 2,86 Z"
                fill={SHAPE_FILL}
              />
              {/* Sides + bottom rim. */}
              <path
                d="M2,14 L2,86 A48,12 0 0 0 98,86 L98,14"
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              {/* Top rim. */}
              <ellipse
                cx="50"
                cy="14"
                rx="48"
                ry="12"
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: SHAPE_FILL,
            border: `${strokeWidth}px solid ${stroke}`,
            // Pill and circle are fully rounded; rectangle gets a soft radius.
            borderRadius:
              shape === "pill" || shape === "circle" ? "9999px" : "0.5rem",
          }}
        />
      )}

      {label ? (
        <div className="absolute inset-0 flex items-center justify-center px-3">
          <span className="pointer-events-none truncate text-center text-sm text-neutral-100">
            {label}
          </span>
        </div>
      ) : null}
    </div>
  )
}
