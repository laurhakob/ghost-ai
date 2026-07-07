"use client"

import { useState } from "react"

import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { useProjectActions } from "@/hooks/use-project-actions"
import { type Project } from "@/lib/projects"

interface WorkspaceShellProps {
  /** The project whose workspace is being viewed. */
  project: Project
  /** Owned projects for the sidebar. */
  projects: Project[]
  /** Shared projects for the sidebar. */
  sharedProjects: Project[]
}

export function WorkspaceShell({
  project,
  projects,
  sharedProjects,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <WorkspaceNavbar
        projectName={project.name}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        isAiOpen={isAiOpen}
        onToggleAi={() => setIsAiOpen((open) => !open)}
        onShare={() => setIsShareOpen(true)}
      />

      <div className="relative flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={projects}
          sharedProjects={sharedProjects}
          currentProjectId={project.id}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />

        <div className="flex h-full">
          {/* Canvas placeholder — fills the remaining space. */}
          <main className="flex flex-1 items-center justify-center bg-neutral-950">
            <p className="text-sm text-neutral-500">
              Canvas for &ldquo;{project.name}&rdquo; coming soon
            </p>
          </main>

          {/* Right sidebar placeholder for the future AI chat. */}
          {isAiOpen && (
            <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
              <div className="flex h-12 shrink-0 items-center border-b border-border px-3">
                <span className="text-sm font-medium text-foreground">
                  AI Assistant
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                AI chat coming soon
              </div>
            </aside>
          )}
        </div>
      </div>

      <ProjectDialogs actions={actions} />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        projectId={project.id}
        projectName={project.name}
        canManage={project.owned}
      />
    </div>
  )
}
