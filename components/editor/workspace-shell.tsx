"use client"

import { useState } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { Canvas } from "@/components/editor/canvas"
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
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
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
        onOpenTemplates={() => setIsTemplatesOpen(true)}
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

        {/* Collaborative canvas — fills the remaining space. */}
        <main className="relative h-full overflow-hidden bg-neutral-950">
          <Canvas
            roomId={project.id}
            templatesOpen={isTemplatesOpen}
            onTemplatesOpenChange={setIsTemplatesOpen}
          />
        </main>

        {/* Floating AI chat sidebar — slides in from the right. */}
        <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
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
