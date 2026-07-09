"use client"

import Link from "next/link"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { type Project } from "@/lib/projects"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  sharedProjects: Project[]
  /** ID of the project whose workspace is currently open, if any. */
  currentProjectId?: string
  onCreateProject: () => void
  onRenameProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

function ProjectItem({
  project,
  isCurrent = false,
  onRename,
  onDelete,
}: {
  project: Project
  isCurrent?: boolean
  onRename: (project: Project) => void
  onDelete: (project: Project) => void
}) {
  return (
    <div
      aria-current={isCurrent ? "page" : undefined}
      className={`group/item flex items-center gap-1 rounded-lg px-2 py-1.5 ${
        isCurrent ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <Link
        href={`/editor/${project.id}`}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="truncate text-sm text-foreground">
          {project.name}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {project.slug}
        </span>
      </Link>
      {/* Actions only for owned projects. */}
      {project.owned && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename ${project.name}`}
            onClick={() => onRename(project)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${project.name}`}
            onClick={() => onDelete(project)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  sharedProjects,
  currentProjectId,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      {/* Mobile backdrop scrim — tapping outside closes the sidebar. */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="absolute inset-0 top-12 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`absolute top-12 left-0 z-40 flex h-[calc(100%-3rem)] w-72 flex-col border-r border-border bg-background transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-sm font-medium text-foreground">Projects</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X />
          </Button>
        </div>

        <Tabs
          defaultValue="my-projects"
          className="flex min-h-0 flex-1 flex-col p-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No projects yet
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {projects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isCurrent={project.id === currentProjectId}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="shared" className="flex-1 overflow-y-auto">
            {sharedProjects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nothing shared with you yet
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {sharedProjects.map((project) => (
                  // Shared/collaborator projects render without actions.
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isCurrent={project.id === currentProjectId}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-border p-3">
          <Button className="w-full" onClick={onCreateProject}>
            <Plus />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
