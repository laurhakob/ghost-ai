"use client"

import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Share2,
} from "lucide-react"

import { Button } from "@/components/ui/button"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiOpen: boolean
  onToggleAi: () => void
  onShare: () => void
  /** Opens the starter-templates import modal. */
  onOpenTemplates: () => void
}

export function WorkspaceNavbar({
  projectName,
  isSidebarOpen,
  onToggleSidebar,
  isAiOpen,
  onToggleAi,
  onShare,
  onOpenTemplates,
}: WorkspaceNavbarProps) {
  return (
    <nav className="flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        <span className="truncate text-sm font-medium text-foreground">
          {projectName}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" onClick={onOpenTemplates}>
          <LayoutTemplate />
          Templates
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 />
          Share
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleAi}
          aria-label={isAiOpen ? "Close AI sidebar" : "Open AI sidebar"}
        >
          {isAiOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
      </div>
    </nav>
  )
}
