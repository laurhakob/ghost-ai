"use client"

import { useCallback, useMemo, useState } from "react"

import {
  mockProjects,
  mockSharedProjects,
  slugify,
  type Project,
} from "@/lib/projects"

export type ProjectDialog = "create" | "rename" | "delete"

export interface UseProjectDialogs {
  /** Projects owned by the current user (shown under "My Projects"). */
  projects: Project[]
  /** Projects shared with the current user by others. */
  sharedProjects: Project[]
  /** Which dialog is currently open, or null when none. */
  openDialog: ProjectDialog | null
  /** The project a rename/delete action targets. */
  activeProject: Project | null
  /** Current value of the name input (create/rename). */
  name: string
  /** Live slug preview derived from `name`. */
  slug: string
  /** Whether a submit is in flight. */
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

export function useProjectDialogs(): UseProjectDialogs {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [sharedProjects] = useState<Project[]>(mockSharedProjects)
  const [openDialog, setOpenDialog] = useState<ProjectDialog | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const slug = useMemo(() => slugify(name), [name])

  const close = useCallback(() => {
    setOpenDialog(null)
    setActiveProject(null)
    setName("")
    setIsLoading(false)
  }, [])

  const openCreate = useCallback(() => {
    setActiveProject(null)
    setName("")
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

  // In-memory only — no API/persistence yet. The list is kept in local state so
  // created/renamed/deleted projects reflect immediately in the sidebar.
  const submitCreate = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsLoading(true)
    const project: Project = {
      id: crypto.randomUUID(),
      name: trimmed,
      slug: slugify(trimmed),
      owned: true,
    }
    setProjects((prev) => [project, ...prev])
    close()
  }, [name, close])

  const submitRename = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed || !activeProject) return
    setIsLoading(true)
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, name: trimmed, slug: slugify(trimmed) }
          : p
      )
    )
    close()
  }, [name, activeProject, close])

  const submitDelete = useCallback(() => {
    if (!activeProject) return
    setIsLoading(true)
    setProjects((prev) => prev.filter((p) => p.id !== activeProject.id))
    close()
  }, [activeProject, close])

  return {
    projects,
    sharedProjects,
    openDialog,
    activeProject,
    name,
    slug,
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
