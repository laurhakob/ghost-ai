"use client"

import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

import {
  SHAPE_DRAG_TYPE,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

interface ShapeDef {
  shape: CanvasNodeShape
  label: string
  icon: LucideIcon
  /** Default size dropped onto the canvas, in canvas units. */
  width: number
  height: number
}

/**
 * The draggable shapes, with sensible default sizes: rectangles are wider than
 * tall, circles are square, and diamonds are slightly larger to give labels room.
 */
const SHAPES: ShapeDef[] = [
  { shape: "rectangle", label: "Rectangle", icon: RectangleHorizontal, width: 160, height: 90 },
  { shape: "diamond", label: "Diamond", icon: Diamond, width: 140, height: 140 },
  { shape: "circle", label: "Circle", icon: Circle, width: 110, height: 110 },
  { shape: "pill", label: "Pill", icon: Pill, width: 160, height: 64 },
  { shape: "cylinder", label: "Cylinder", icon: Cylinder, width: 120, height: 140 },
  { shape: "hexagon", label: "Hexagon", icon: Hexagon, width: 150, height: 120 },
]

/**
 * Floating pill-shaped toolbar at the bottom-center of the canvas. Each button
 * is draggable; dragging carries the shape name and its default size so the
 * canvas can create a matching node on drop.
 */
export function ShapePanel() {
  function handleDragStart(
    event: React.DragEvent<HTMLButtonElement>,
    def: ShapeDef,
  ) {
    const payload: ShapeDragPayload = {
      shape: def.shape,
      width: def.width,
      height: def.height,
    }
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/90 px-2 py-1.5 shadow-lg backdrop-blur">
        {SHAPES.map((def) => {
          const Icon = def.icon
          return (
            <button
              key={def.shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, def)}
              title={`Drag to add ${def.label.toLowerCase()}`}
              aria-label={`Add ${def.label}`}
              className="flex size-9 cursor-grab items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white/10 hover:text-white active:cursor-grabbing"
            >
              <Icon className="size-5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
