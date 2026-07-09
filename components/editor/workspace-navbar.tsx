"use client"

import {
  Bot,
  Check,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Share2,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiOpen: boolean
  onToggleAi: () => void
  onShare: () => void
  /** Opens the starter-templates import modal. */
  onOpenTemplates: () => void
  /** Current canvas autosave status, shown in the Save indicator. */
  saveStatus: SaveStatus
}

/** Icon + label + tone for each autosave status. */
const SAVE_STATUS_DISPLAY: Record<
  SaveStatus,
  { icon: typeof Save; label: string; className: string }
> = {
  idle: { icon: Save, label: "Saved", className: "text-muted-foreground" },
  saving: { icon: Loader2, label: "Saving…", className: "text-muted-foreground" },
  saved: { icon: Check, label: "Saved", className: "text-primary" },
  error: { icon: TriangleAlert, label: "Save failed", className: "text-destructive" },
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { icon: Icon, label, className } = SAVE_STATUS_DISPLAY[status]
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 px-2 text-xs font-medium ${className}`}
    >
      <Icon className={status === "saving" ? "size-3.5 animate-spin" : "size-3.5"} />
      {label}
    </div>
  )
}

export function WorkspaceNavbar({
  projectName,
  isSidebarOpen,
  onToggleSidebar,
  isAiOpen,
  onToggleAi,
  onShare,
  onOpenTemplates,
  saveStatus,
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

      <div className="flex shrink-0 items-center gap-2">
        <SaveIndicator status={saveStatus} />

        {/* Divider between the passive save state and the action buttons. */}
        <div className="h-5 w-px bg-border" />

        {/* Secondary actions share one subtle, rounded pill group. */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTemplates}
            className="h-7 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="h-7 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>

        {/* Primary AI action — icon + label, with a cyan→green accent gradient
            that ties the AI (cyan) and chat (green) accents together. */}
        <Button
          size="sm"
          onClick={onToggleAi}
          aria-label={isAiOpen ? "Close AI sidebar" : "Open AI sidebar"}
          aria-pressed={isAiOpen}
          className={cn(
            "h-8 gap-1.5 rounded-lg bg-gradient-to-r from-primary to-[#62C073] px-3 font-semibold text-neutral-950 shadow-sm transition-all hover:opacity-90 hover:shadow-md",
            isAiOpen && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
          )}
        >
          <Bot className="size-4" />
          AI
        </Button>
      </div>
    </nav>
  )
}
