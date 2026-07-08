"use client"

import { useEffect } from "react"

import type { ReactFlowInstance } from "@xyflow/react"

/** Duration (ms) of the smooth zoom animation, shared with the control bar. */
export const ZOOM_ANIMATION_DURATION = 200

interface UseKeyboardShortcutsOptions {
  /** React Flow instance whose viewport the zoom shortcuts drive. */
  reactFlow: Pick<ReactFlowInstance, "zoomIn" | "zoomOut">
  /** Called for Cmd/Ctrl+Z. */
  onUndo: () => void
  /** Called for Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y. */
  onRedo: () => void
}

/**
 * True when a keyboard event originates from a text-entry context (input,
 * textarea, or any contentEditable element), so we can leave typing untouched.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable
  )
}

/**
 * Binds the canvas ergonomics shortcuts to `window`:
 *
 *  - `+` / `=` — zoom in
 *  - `-`       — zoom out
 *  - Cmd/Ctrl+Z             — undo
 *  - Cmd/Ctrl+Shift+Z / +Y  — redo
 *
 * Shortcuts are ignored while the user is typing in an input, textarea, or
 * editable field (e.g. node/edge label editors), so text entry is unaffected.
 */
export function useKeyboardShortcuts({
  reactFlow,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const mod = event.metaKey || event.ctrlKey

      // Undo / redo (Cmd/Ctrl based).
      if (mod) {
        const key = event.key.toLowerCase()
        if (key === "z") {
          event.preventDefault()
          if (event.shiftKey) onRedo()
          else onUndo()
          return
        }
        if (key === "y") {
          event.preventDefault()
          onRedo()
          return
        }
        return
      }

      // Zoom (no modifier).
      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault()
          void reactFlow.zoomIn({ duration: ZOOM_ANIMATION_DURATION })
          break
        case "-":
          event.preventDefault()
          void reactFlow.zoomOut({ duration: ZOOM_ANIMATION_DURATION })
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reactFlow, onUndo, onRedo])
}
