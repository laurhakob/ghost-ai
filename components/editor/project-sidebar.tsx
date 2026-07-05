"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
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

      <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col p-3">
        <TabsList className="w-full">
          <TabsTrigger value="my-projects" className="flex-1">
            My Projects
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex-1">
            Shared
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="my-projects"
          className="flex flex-1 items-center justify-center text-sm text-muted-foreground"
        >
          No projects yet
        </TabsContent>
        <TabsContent
          value="shared"
          className="flex flex-1 items-center justify-center text-sm text-muted-foreground"
        >
          Nothing shared with you yet
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-border p-3">
        <Button className="w-full">
          <Plus />
          New Project
        </Button>
      </div>
    </aside>
  )
}
