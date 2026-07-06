"use client"

import { useEffect, useRef } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UseProjectDialogs } from "@/hooks/use-project-dialogs"

interface ProjectDialogsProps {
  dialogs: UseProjectDialogs
}

export function ProjectDialogs({ dialogs }: ProjectDialogsProps) {
  const {
    openDialog,
    activeProject,
    name,
    slug,
    isLoading,
    setName,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  } = dialogs

  const renameInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus (and select) the rename input when the dialog opens.
  useEffect(() => {
    if (openDialog === "rename") {
      const id = requestAnimationFrame(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [openDialog])

  const onOpenChange = (open: boolean) => {
    if (!open) close()
  }

  return (
    <>
      {/* Create Project */}
      <Dialog open={openDialog === "create"} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Start a new architecture workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              submitCreate()
            }}
          >
            <div className="flex flex-col gap-2">
              <Input
                autoFocus
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Slug:{" "}
                <span className="font-mono text-foreground">
                  {slug || "—"}
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project */}
      <Dialog open={openDialog === "rename"} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Renaming{" "}
              <span className="text-foreground">
                {activeProject?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              submitRename()
            }}
          >
            <Input
              ref={renameInputRef}
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project */}
      <Dialog open={openDialog === "delete"} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="text-foreground">
                {activeProject?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={submitDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
