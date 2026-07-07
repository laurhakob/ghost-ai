"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, Loader2, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Collaborator } from "@/lib/collaborators"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  /** Whether the current user owns the project and may manage access. */
  canManage: boolean
}

/** Initials fallback for collaborators without a Clerk avatar. */
function initials(collaborator: Collaborator): string {
  const source = collaborator.name ?? collaborator.email
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function CollaboratorRow({
  collaborator,
  canManage,
  onRemove,
  isRemoving,
}: {
  collaborator: Collaborator
  canManage: boolean
  onRemove: (email: string) => void
  isRemoving: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      {collaborator.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.imageUrl}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {initials(collaborator)}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {collaborator.name && (
          <span className="truncate text-sm font-medium text-foreground">
            {collaborator.name}
          </span>
        )}
        <span className="truncate text-xs text-muted-foreground">
          {collaborator.email}
        </span>
      </div>

      {canManage && (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isRemoving}
          onClick={() => onRemove(collaborator.email)}
          aria-label={`Remove ${collaborator.email}`}
        >
          {isRemoving ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 />
          )}
        </Button>
      )}
    </div>
  )
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  canManage,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const projectLink = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/editor/${projectId}`
  }, [projectId])

  const loadCollaborators = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`)
      if (!res.ok) throw new Error("Failed to load collaborators")
      const data = (await res.json()) as { collaborators: Collaborator[] }
      setCollaborators(data.collaborators)
    } catch {
      setError("Could not load collaborators.")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Load the collaborator list each time the dialog opens; reset transient
  // state when it closes.
  useEffect(() => {
    if (open) {
      loadCollaborators()
    } else {
      setEmail("")
      setError(null)
      setCopied(false)
    }
  }, [open, loadCollaborators])

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
    }
  }, [])

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || isInviting) return

    setIsInviting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? "Failed to invite collaborator")
      }
      const invited = (await res.json()) as Collaborator
      setCollaborators((prev) => {
        const exists = prev.some(
          (c) => c.email.toLowerCase() === invited.email.toLowerCase()
        )
        return exists ? prev : [...prev, invited]
      })
      setEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (target: string) => {
    setRemovingEmail(target)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      })
      if (!res.ok) throw new Error("Failed to remove collaborator")
      setCollaborators((prev) => prev.filter((c) => c.email !== target))
    } catch {
      setError("Could not remove collaborator.")
    } finally {
      setRemovingEmail(null)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectLink)
      setCopied(true)
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
      copyTimeout.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Could not copy the link.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            {canManage
              ? `Invite people to collaborate on "${projectName}".`
              : `People with access to "${projectName}".`}
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <form className="flex items-center gap-2" onSubmit={handleInvite}>
            <Input
              type="email"
              autoFocus
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={!email.trim() || isInviting}>
              {isInviting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Invite
            </Button>
          </form>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-col gap-1">
          <p className="px-2 text-xs font-medium text-muted-foreground">
            Collaborators
          </p>
          <ScrollArea className="max-h-56">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" />
                Loading…
              </div>
            ) : collaborators.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No collaborators yet.
              </p>
            ) : (
              <div className="flex flex-col">
                {collaborators.map((collaborator) => (
                  <CollaboratorRow
                    key={collaborator.email}
                    collaborator={collaborator}
                    canManage={canManage}
                    onRemove={handleRemove}
                    isRemoving={removingEmail === collaborator.email}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Input readOnly value={projectLink} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              aria-label="Copy project link"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
