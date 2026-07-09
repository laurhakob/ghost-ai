"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/** Current state of the canvas autosave loop. */
export type SaveStatus = "idle" | "saving" | "saved" | "error"

/** Delay after the last change before a save fires, in milliseconds. */
const AUTOSAVE_DEBOUNCE_MS = 1200

interface UseCanvasAutosaveOptions {
  /** Project (room) ID the canvas belongs to. */
  projectId: string
  /** Current canvas nodes, kept in sync by Liveblocks. */
  nodes: CanvasNode[]
  /** Current canvas edges, kept in sync by Liveblocks. */
  edges: CanvasEdge[]
  /**
   * Whether autosave is active. Held off until the initial load check
   * completes so a debounced save can't overwrite the saved blob mid-load.
   */
  enabled: boolean
}

/**
 * Debounced canvas autosave. Watches the synced nodes/edges and, once
 * {@link UseCanvasAutosaveOptions.enabled} is true, persists changes through
 * `PUT /api/projects/[projectId]/canvas`, reporting a coarse save status.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveOptions): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle")

  // Serialized snapshot — comparing this avoids saving when Liveblocks hands
  // back new array references without any real content change.
  const signature = useMemo(
    () => JSON.stringify({ nodes, edges }),
    [nodes, edges]
  )

  const lastSavedRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    // First run after enabling captures the loaded state as the baseline so we
    // don't re-save what we just loaded.
    if (lastSavedRef.current === null) {
      lastSavedRef.current = signature
      return
    }

    if (lastSavedRef.current === signature) return

    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus("saving")

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: signature,
        })
        if (!res.ok) throw new Error(`Save failed: ${res.status}`)
        lastSavedRef.current = signature
        setStatus("saved")
      } catch {
        setStatus("error")
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [signature, enabled, projectId])

  return status
}
