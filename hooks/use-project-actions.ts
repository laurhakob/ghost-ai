"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { buildRoomId, generateRoomSuffix, type Project } from "@/lib/projects"

export type ProjectDialog = "create" | "rename" | "delete"

export interface UseProjectActions {
  /** Which dialog is currently open, or null when none. */
  openDialog: ProjectDialog | null
  /** The project a rename/delete action targets. */
  activeProject: Project | null
  /** Current value of the name input (create/rename). */
  name: string
  /** Live room ID preview for the create dialog (slug + unique suffix). */
  roomId: string
  /** Whether a mutation is in flight. */
  isLoading: boolean
  setName: (name: string) => void
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  close: () => void
  submitCreate: () => void
  submitRename: () => void
  submitDelete: () => void
}

export function useProjectActions(): UseProjectActions {
  const router = useRouter()
  const pathname = usePathname()

  const [openDialog, setOpenDialog] = useState<ProjectDialog | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  // A stable suffix generated when the create dialog opens so the previewed
  // room ID matches the one we submit.
  const [suffix, setSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const roomId = useMemo(() => buildRoomId(name, suffix), [name, suffix])

  const close = useCallback(() => {
    setOpenDialog(null)
    setActiveProject(null)
    setName("")
    setIsLoading(false)
  }, [])

  const openCreate = useCallback(() => {
    setActiveProject(null)
    setName("")
    setSuffix(generateRoomSuffix())
    setIsLoading(false)
    setOpenDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setActiveProject(project)
    setName(project.name)
    setIsLoading(false)
    setOpenDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setActiveProject(project)
    setName("")
    setIsLoading(false)
    setOpenDialog("delete")
  }, [])

  const submitCreate = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = buildRoomId(trimmed, suffix)
    setIsLoading(true)
    ;(async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Send the room ID as the project ID so the two stay aligned.
          body: JSON.stringify({ id, name: trimmed }),
        })
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        const created: { id: string } = await res.json()
        // Navigate to the new workspace.
        router.push(`/editor/${created.id}`)
      } catch {
        setIsLoading(false)
      }
    })()
  }, [name, suffix, router])

  const submitRename = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed || !activeProject) return
    setIsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${activeProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        })
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        close()
        router.refresh()
      } catch {
        setIsLoading(false)
      }
    })()
  }, [name, activeProject, close, router])

  const submitDelete = useCallback(() => {
    if (!activeProject) return
    const target = activeProject
    setIsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${target.id}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        close()
        // If we're deleting the workspace we're currently viewing, leave it.
        if (pathname === `/editor/${target.id}`) {
          router.push("/editor")
        } else {
          router.refresh()
        }
      } catch {
        setIsLoading(false)
      }
    })()
  }, [activeProject, pathname, close, router])

  return {
    openDialog,
    activeProject,
    name,
    roomId,
    isLoading,
    setName,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  }
}
