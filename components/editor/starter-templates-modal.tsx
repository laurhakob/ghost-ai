"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TemplatePreview } from "@/components/editor/template-preview"
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the chosen template; the modal closes afterwards. */
  onImport: (template: CanvasTemplate) => void
}

/**
 * Dialog listing the built-in starter templates as cards in a scrollable grid.
 * Each card shows a diagram preview, the template name + description, and an
 * import button that hands the template to {@link onImport}.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Pick a starter diagram to replace the current canvas. This clears any
            existing work.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] -mx-1 px-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4"
              >
                <TemplatePreview template={template} />

                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="text-sm font-medium text-foreground">
                    {template.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => onImport(template)}
                >
                  Import
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
