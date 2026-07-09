"use client"

import Link from "next/link"
import { FolderKanban, Pencil, Plus, Trash2, X } from "lucide-react"

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

/**
 * Shared active/inactive styling for the sidebar tabs, mirroring the AI
 * sidebar: active tabs pick up the project accent (primary) token, inactive
 * ones stay muted.
 */
const TAB_TRIGGER_CLASS =
  "flex-1 text-muted-foreground data-active:bg-primary/15 data-active:text-primary dark:data-active:bg-primary/15 dark:data-active:text-primary"

/** Derives a one-letter glyph for a project's avatar tile. */
function getGlyph(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : "•"
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
      className={`group/item relative flex items-center gap-2.5 rounded-xl border px-2 py-2 transition-colors ${
        isCurrent
          ? "border-primary/30 bg-primary/[0.08]"
          : "border-transparent hover:border-border hover:bg-muted/50"
      }`}
    >
      {/* Accent bar marking the currently-open project. */}
      {isCurrent && (
        <span className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}

      <Link
        href={`/editor/${project.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        {/* Initial tile — gradient accent when current, muted otherwise. */}
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
            isCurrent
              ? "bg-gradient-to-br from-primary to-[#62C073] text-neutral-950 shadow-sm"
              : "bg-muted text-muted-foreground group-hover/item:text-foreground"
          }`}
        >
          {getGlyph(project.name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={`truncate text-sm ${
              isCurrent ? "font-medium text-foreground" : "text-foreground"
            }`}
          >
            {project.name}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {project.slug}
          </span>
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
            className="hover:bg-destructive/15 hover:text-destructive"
            onClick={() => onDelete(project)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

/** Empty-state placeholder shared by both tabs. */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
        <FolderKanban className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
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
        className={`absolute top-12 left-0 z-40 flex h-[calc(100%-3rem)] w-72 flex-col border-r border-border bg-background/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header — subtle accent wash + gradient folder badge. */}
        <div className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/[0.08] via-transparent to-[#62C073]/[0.08] px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#62C073] text-neutral-950 shadow-sm">
              <FolderKanban className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                Projects
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Your workspaces
              </span>
            </div>
          </div>
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
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="m-3 w-[calc(100%-1.5rem)] shrink-0">
            <TabsTrigger value="my-projects" className={TAB_TRIGGER_CLASS}>
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className={TAB_TRIGGER_CLASS}>
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="my-projects"
            className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 data-[state=inactive]:hidden"
          >
            {projects.length === 0 ? (
              <EmptyState label="No projects yet" />
            ) : (
              <div className="flex flex-col gap-1">
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
          <TabsContent
            value="shared"
            className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 data-[state=inactive]:hidden"
          >
            {sharedProjects.length === 0 ? (
              <EmptyState label="Nothing shared with you yet" />
            ) : (
              <div className="flex flex-col gap-1">
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
          <Button
            className="w-full shadow-sm transition-opacity hover:opacity-90"
            onClick={onCreateProject}
          >
            <Plus />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
