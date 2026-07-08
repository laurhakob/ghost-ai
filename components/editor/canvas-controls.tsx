"use client"

import { Maximize, Minus, Plus, Redo2, Undo2, type LucideIcon } from "lucide-react"

import { useReactFlow } from "@xyflow/react"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react/suspense"

import { ZOOM_ANIMATION_DURATION } from "@/hooks/use-keyboard-shortcuts"
import { cn } from "@/lib/utils"

/**
 * Floating pill-shaped control bar at the bottom-left of the canvas, sitting
 * above the shape panel. Groups zoom controls (zoom out, fit view, zoom in) and
 * history controls (undo, redo), separated by a thin divider.
 *
 * Zoom actions drive the React Flow instance with a short animation; undo/redo
 * use Liveblocks history and disable (and dim) when there is nothing to undo or
 * redo.
 */
export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const animate = { duration: ZOOM_ANIMATION_DURATION }

  return (
    <div className="pointer-events-none absolute bottom-6 left-6 z-10">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/90 px-2 py-1.5 shadow-lg backdrop-blur">
        <ControlButton
          icon={Minus}
          label="Zoom out"
          onClick={() => void zoomOut(animate)}
        />
        <ControlButton
          icon={Maximize}
          label="Fit view"
          onClick={() => void fitView(animate)}
        />
        <ControlButton
          icon={Plus}
          label="Zoom in"
          onClick={() => void zoomIn(animate)}
        />

        <div className="mx-1 h-5 w-px bg-white/10" />

        <ControlButton
          icon={Undo2}
          label="Undo"
          disabled={!canUndo}
          onClick={undo}
        />
        <ControlButton
          icon={Redo2}
          label="Redo"
          disabled={!canRedo}
          onClick={redo}
        />
      </div>
    </div>
  )
}

interface ControlButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

/** A single icon button in the control bar. Dimmed and inert when disabled. */
function ControlButton({ icon: Icon, label, onClick, disabled }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-neutral-300 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
