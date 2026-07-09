"use client"

import { useState } from "react"

import {
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { Canvas } from "@/components/editor/canvas"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { type SaveStatus } from "@/hooks/use-canvas-autosave"
import { useProjectActions } from "@/hooks/use-project-actions"
import { type Project } from "@/lib/projects"
import { type AiStatusMessage } from "@/types/tasks"

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  // Latest shared AI status message (from the `ai-status-feed`), surfaced in the
  // AI sidebar so the whole room sees when the AI is working.
  const [aiStatus, setAiStatus] = useState<AiStatusMessage | null>(null)
  // Whether the local user is currently prompting the AI. Published to their
  // Liveblocks presence via the canvas so others see a spinner on their cursor.
  const [isThinking, setIsThinking] = useState(false)
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
        saveStatus={saveStatus}
      />

      {/* One Liveblocks room shared by the canvas and the AI sidebar, so both
          can subscribe to presence and the room's Storage feeds. */}
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={project.id}
          initialPresence={{ cursor: null, thinking: false }}
        >
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
                onSaveStatusChange={setSaveStatus}
                onAiStatusChange={setAiStatus}
                thinking={isThinking}
              />
            </main>

            {/* Floating AI chat sidebar — slides in from the right. */}
            <AiSidebar
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              projectId={project.id}
              aiStatus={aiStatus}
              onThinkingChange={setIsThinking}
            />
          </div>
        </RoomProvider>
      </LiveblocksProvider>

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
