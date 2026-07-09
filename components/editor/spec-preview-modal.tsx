"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Loader2, TriangleAlert } from "lucide-react"
import ReactMarkdown from "react-markdown"

import type { Components } from "react-markdown"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SpecPreviewModalProps {
  /** The project the spec belongs to. */
  projectId: string
  /** The spec to preview, or null when the modal is closed. */
  spec: { id: string; filename: string; createdAt: string } | null
  /** Close the modal. */
  onClose: () => void
  /** Trigger a file download for the given spec. */
  onDownload: (spec: { id: string; filename: string }) => void
}

/**
 * Tailwind-styled element map for the rendered Markdown. Keeps the preview
 * readable without pulling in a typography plugin, using existing tokens.
 */
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-3 text-lg font-semibold text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
}

/** Formats an ISO timestamp as a readable local date + time. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * Preview dialog for a generated spec. The Markdown content is fetched from the
 * per-spec download endpoint (never the Blob URL directly) whenever a spec is
 * selected, then rendered as Markdown. Content is fetched fresh each open and
 * dropped on close — it is never held in long-term state.
 */
export function SpecPreviewModal({
  projectId,
  spec,
  onClose,
  onDownload,
}: SpecPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!spec) {
      // Drop any previewed content once the modal closes.
      setContent(null)
      setError(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(false)
    setContent(null)

    // Fetch the spec content through the authenticated download endpoint. A
    // `fetch()` reads the body regardless of the attachment header, so we can
    // render it inline without touching the private Blob store from the client.
    fetch(`/api/projects/${projectId}/specs/${spec.id}/download`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, spec])

  return (
    <Dialog open={spec !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileText className="size-5 shrink-0 text-primary" />
            <span className="truncate">{spec?.filename ?? "Spec"}</span>
          </DialogTitle>
          <DialogDescription>
            {spec ? `Generated ${formatDate(spec.createdAt)}` : null}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-1 py-5">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading spec…
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <TriangleAlert className="size-5 text-destructive" />
                Couldn&apos;t load this spec. Please try again.
              </div>
            ) : (
              <div className="max-w-none px-2">
                <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                  {content ?? ""}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            type="button"
            onClick={() => spec && onDownload(spec)}
            disabled={!spec}
            className="bg-primary text-white hover:bg-primary/80"
          >
            <Download />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
