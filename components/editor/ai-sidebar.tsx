"use client"

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react"
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react"
import { useMutation, useSelf, useStorage } from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SpecPreviewModal } from "@/components/editor/spec-preview-modal"
import type { designAgent } from "@/trigger/design-agent"
import type { generateSpec } from "@/trigger/generate-spec"
import {
  AI_CHAT_KEY,
  parseAiChatMessage,
  type AiChatMessage,
  type AiStatusMessage,
} from "@/types/tasks"

/** Cap on retained chat history so the shared feed can't grow unbounded. */
const MAX_CHAT_MESSAGES = 100

/**
 * Green project accent used for the local user's chat bubbles and the send
 * button, per the design spec. It isn't a shadcn token, so it's applied via
 * Tailwind arbitrary values from this single source.
 */
const ACCENT_GREEN = "#62C073"

/** Sender identity stamped on the AI's own final chat messages. */
const GHOST_AI_SENDER = { id: "ghost-ai", name: "Ghost AI" } as const

interface AiSidebarProps {
  /** Whether the sidebar is visible — controlled by the parent. */
  isOpen: boolean
  /** Collapse the sidebar. */
  onClose: () => void
  /** The project/room the design agent should act on (both are the project id). */
  projectId: string
  /** Latest shared AI status message from the `ai-status-feed`, or null. */
  aiStatus: AiStatusMessage | null
  /** Reports whether the local user is currently prompting the AI. */
  onThinkingChange: (thinking: boolean) => void
}

/** Starter prompt suggestions shown in the empty chat state. */
const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

/**
 * Shared active/inactive styling for the two sidebar tabs. Active tabs use the
 * project accent (primary) token; inactive tabs stay muted.
 */
const TAB_TRIGGER_CLASS =
  "flex-1 text-muted-foreground data-active:bg-primary/15 data-active:text-primary dark:data-active:bg-primary/15 dark:data-active:text-primary"

/** Formats a message timestamp as a short local time (e.g. "3:04 PM"). */
function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Derives up-to-two-letter initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Small avatar shown beside another participant's (or the AI's) message. The AI
 * gets the cyan→green gradient badge; humans get their photo, falling back to
 * color-tinted initials.
 */
function MessageAvatar({ message }: { message: AiChatMessage }) {
  if (message.role === "assistant") {
    return (
      <div className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#62C073] text-neutral-950 shadow-sm">
        <Bot className="size-4" />
      </div>
    )
  }
  if (message.sender.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={message.sender.avatar}
        alt={message.sender.name}
        className="mt-5 size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <div
      className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold text-neutral-950"
      style={{ backgroundColor: message.sender.color ?? "#71717a" }}
    >
      {getInitials(message.sender.name)}
    </div>
  )
}

/**
 * A single room-chat message. The local user's messages are right-aligned with
 * the green accent; everyone else's are left-aligned with an avatar and a name
 * label. The AI's own replies get a subtle accent-tinted bubble.
 */
function ChatBubble({
  message,
  isMine,
}: {
  message: AiChatMessage
  isMine: boolean
}) {
  const isAi = message.role === "assistant"
  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {!isMine ? <MessageAvatar message={message} /> : null}
      <div className={`flex max-w-[80%] flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender + timestamp header. */}
        <div className="mb-1 flex items-center gap-1.5 px-1 text-[0.6875rem] text-muted-foreground">
          {!isMine ? (
            <span
              className="font-semibold"
              style={
                isAi
                  ? { color: ACCENT_GREEN }
                  : message.sender.color
                    ? { color: message.sender.color }
                    : undefined
              }
            >
              {message.sender.name}
            </span>
          ) : null}
          <span>{formatTime(message.at)}</span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
            isMine
              ? "rounded-br-md text-neutral-950"
              : isAi
                ? "rounded-bl-md border border-primary/25 bg-primary/[0.07] text-foreground"
                : "rounded-bl-md border border-border bg-card text-foreground"
          }`}
          // Local user's bubbles use the green accent background with dark,
          // readable text; the AI and other people stay on dark surfaces.
          style={isMine ? { backgroundColor: ACCENT_GREEN } : undefined}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

interface ArchitectTabProps {
  projectId: string
  /** Latest shared AI status message, or null when idle. */
  aiStatus: AiStatusMessage | null
  /** Reports whether the local user is currently prompting the AI. */
  onThinkingChange: (thinking: boolean) => void
}

function ArchitectTab({
  projectId,
  aiStatus,
  onThinkingChange,
}: ArchitectTabProps) {
  const [input, setInput] = useState("")
  // The POST /api/ai/design request is in flight (before the run is tracked).
  const [isSubmitting, setIsSubmitting] = useState(false)
  // The active design run to subscribe to, or null when no run is in progress.
  const [run, setRun] = useState<{ id: string; token: string } | null>(null)

  // Subscribe to the shared room chat feed (`ai-chat`) and validate every entry
  // before rendering — the feed lives in untrusted shared realtime state, and
  // is kept entirely separate from the AI status feed.
  const rawMessages = useStorage((root) => root[AI_CHAT_KEY])
  const messages = useMemo(() => {
    if (!rawMessages) return []
    return rawMessages
      .map(parseAiChatMessage)
      .filter((message): message is AiChatMessage => message !== null)
  }, [rawMessages])

  // The local user's id, used to right-align their own messages. Null until the
  // room connects.
  const myId = useSelf((me) => me.id)

  // Appends the local user's message to the `ai-chat` feed. Uses the same
  // full-array `set` pattern as the other room feeds; capped so history stays
  // bounded.
  const publishMessage = useMutation(({ storage, self }, content: string) => {
    const message: AiChatMessage = {
      id: `${self.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: {
        id: self.id,
        name: self.info.name,
        color: self.info.color,
        avatar: self.info.avatar,
      },
      role: "user",
      content,
      at: Date.now(),
    }
    const current = storage.get(AI_CHAT_KEY) ?? []
    storage.set(AI_CHAT_KEY, [...current, message].slice(-MAX_CHAT_MESSAGES))
  }, [])

  // Appends an AI (assistant) message to the shared chat feed — used for the
  // final "done"/error line once a run resolves, and for send failures. Only
  // the submitting client publishes these, so the room never sees duplicates.
  const publishAssistantMessage = useMutation(({ storage }, content: string) => {
    const message: AiChatMessage = {
      id: `ghost-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: { ...GHOST_AI_SENDER },
      role: "assistant",
      content,
      at: Date.now(),
    }
    const current = storage.get(AI_CHAT_KEY) ?? []
    storage.set(AI_CHAT_KEY, [...current, message].slice(-MAX_CHAT_MESSAGES))
  }, [])

  // Track the active run in realtime using the run-scoped public token returned
  // by /api/ai/design. Canvas/edge/presence updates arrive automatically via
  // Liveblocks — this subscription is only for the run's *lifecycle*.
  const { run: realtimeRun } = useRealtimeRun<typeof designAgent>(run?.id, {
    accessToken: run?.token,
    enabled: run !== null,
    onComplete: (completed, err) => {
      // Post a final AI message summarising the outcome, then clear run state.
      if (err || completed.isFailed) {
        publishAssistantMessage(
          "Ghost AI ran into a problem and couldn't finish that design. Please try again.",
        )
      } else {
        publishAssistantMessage("Done — I've updated the canvas from your prompt.")
      }
      setRun(null)
      onThinkingChange(false)
    },
  })

  // The local run is still active until it completes or fails.
  const isRunActive =
    run !== null && !(realtimeRun?.isCompleted || realtimeRun?.isFailed)
  // The AI is working somewhere in the room (from the separate status feed) —
  // keeps the sidebar collaborative for participants who didn't submit.
  const isGenerating = aiStatus?.active === true
  // The AI is running (locally or elsewhere in the room).
  const isWorking = isRunActive || isGenerating
  // Block sending while submitting or while any run is in progress.
  const isBusy = isSubmitting || isWorking

  const send = async () => {
    const trimmed = input.trim()
    if (!trimmed || isBusy) return

    // 1) Broadcast the message to the shared room chat so every participant
    //    sees it. This is pure Liveblocks Storage — no backend involved.
    try {
      publishMessage(trimmed)
    } catch {
      publishAssistantMessage("Couldn't send that message. Please try again.")
      return
    }
    setInput("")

    // 2) The Architect input is also the AI's entry point: kick off the design
    //    agent, then subscribe to the returned run so we can react when it
    //    completes. Canvas changes stream in on their own via Liveblocks.
    setIsSubmitting(true)
    onThinkingChange(true)
    try {
      const res = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          roomId: projectId,
          projectId,
        }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = (await res.json()) as {
        runId?: string
        publicToken?: string
      }
      if (!data.runId || !data.publicToken) {
        throw new Error("Malformed response")
      }
      setRun({ id: data.runId, token: data.publicToken })
    } catch {
      // Surface the failure in the chat feed and release the thinking state;
      // no run to track, so onComplete won't fire to clean up.
      publishAssistantMessage(
        "Ghost AI couldn't start on that — please try again.",
      )
      onThinkingChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits, Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable chat area. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            {/* Glowing gradient badge. */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#62C073] opacity-40 blur-xl" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#62C073] text-neutral-950 shadow-lg">
                <Bot className="size-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Design with Ghost AI
              </h3>
              <p className="mx-auto max-w-[16rem] text-sm text-muted-foreground">
                Describe what you want to build. Ghost AI draws it on the canvas
                — live, for everyone in the room.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground/70 uppercase">
                Try a prompt
              </span>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="group flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
                >
                  <Sparkles className="size-3.5 shrink-0 text-primary" />
                  <span className="flex-1">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isMine={message.sender.id === myId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area with an auto-resizing textarea. */}
      <div className="shrink-0 border-t border-border p-3">
        {/* Compact status strip — shown only while a run is active. Dark base
            with a green accent; text comes from the shared `ai-status-feed`. */}
        {isWorking ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center gap-2 overflow-hidden rounded-xl border bg-card px-3 py-2 text-xs"
            style={{ borderColor: `${ACCENT_GREEN}55`, color: ACCENT_GREEN }}
          >
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
            <span className="truncate">
              {aiStatus?.text ?? "Ghost AI is working…"}
            </span>
          </div>
        ) : null}

        {/* Unified input surface: borderless textarea + inline send button,
            wrapped in a card that lights up with the accent when focused. */}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isWorking}
            placeholder={
              isWorking ? "Ghost AI is working…" : "Message the room…"
            }
            className="max-h-40 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void send()}
            disabled={!input.trim() || isBusy}
            aria-label="Send message"
            className="size-8 shrink-0 rounded-xl text-neutral-950 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: ACCENT_GREEN }}
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[0.625rem] text-muted-foreground/60">
          <kbd className="font-sans font-medium">Enter</kbd> to send ·{" "}
          <kbd className="font-sans font-medium">Shift+Enter</kbd> for a new line
        </p>
      </div>
    </div>
  )
}

/** Metadata for a single generated spec, as returned by the specs list route. */
interface SpecListItem {
  id: string
  createdAt: string
}

/** Derives the download filename for a spec — matches the download route. */
function specFilename(id: string): string {
  return `spec-${id}.md`
}

/** Formats an ISO timestamp as a readable local date + time. */
function formatSpecDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * Triggers a browser download of a spec via the authenticated download route.
 * The route sends the file as an attachment, so a temporary anchor click lets
 * the browser save it without the client ever touching the Blob store.
 */
function downloadSpec(projectId: string, specId: string) {
  const anchor = document.createElement("a")
  anchor.href = `/api/projects/${projectId}/specs/${specId}/download`
  anchor.download = specFilename(specId)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function SpecsTab({ projectId }: { projectId: string }) {
  // null while loading; an array (possibly empty) once loaded.
  const [specs, setSpecs] = useState<SpecListItem[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  // The spec currently open in the preview modal, or null when closed.
  const [previewId, setPreviewId] = useState<string | null>(null)
  // The POST /api/ai/spec + token request is in flight (before the run tracks).
  const [isStarting, setIsStarting] = useState(false)
  // The active spec-generation run to subscribe to, or null when idle.
  const [run, setRun] = useState<{ id: string; token: string } | null>(null)
  // A user-facing error from the last generation attempt, or null.
  const [genError, setGenError] = useState<string | null>(null)

  // The room chat feed feeds context into the spec. Read it from shared storage
  // (the sidebar sits inside the room) and map to the task's { role, content }.
  const rawChat = useStorage((root) => root[AI_CHAT_KEY])
  const chatHistory = useMemo(() => {
    if (!rawChat) return []
    return rawChat
      .map(parseAiChatMessage)
      .filter((message): message is AiChatMessage => message !== null)
      .map((message) => ({ role: message.role, content: message.content }))
  }, [rawChat])

  const loadSpecs = useCallback(async (): Promise<void> => {
    setLoadError(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs`)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = (await res.json()) as { specs?: SpecListItem[] }
      setSpecs(data.specs ?? [])
    } catch {
      setLoadError(true)
      setSpecs([])
    }
  }, [projectId])

  useEffect(() => {
    setSpecs(null)
    void loadSpecs()
  }, [loadSpecs])

  // Subscribe to the active spec run's lifecycle. The run's metadata carries a
  // human status (set by the task) for the progress strip; on completion we
  // reload the list so the freshly persisted spec appears.
  const { run: realtimeRun } = useRealtimeRun<typeof generateSpec>(run?.id, {
    accessToken: run?.token,
    enabled: run !== null,
    onComplete: (completed, err) => {
      setRun(null)
      if (err || completed.isFailed) {
        setGenError("Spec generation failed. Please try again.")
      } else {
        void loadSpecs()
      }
    },
  })

  // The run is active until it resolves. isBusy also covers the initial POST.
  const isRunActive =
    run !== null && !(realtimeRun?.isCompleted || realtimeRun?.isFailed)
  const isBusy = isStarting || isRunActive
  // Human status from the task's run metadata, shown while generating.
  const statusText =
    typeof realtimeRun?.metadata?.status === "string"
      ? realtimeRun.metadata.status
      : "Generating spec…"

  const generateSpecRun = async () => {
    if (isBusy) return
    setGenError(null)
    setIsStarting(true)
    try {
      // 1) Grab the latest saved canvas snapshot (autosaved) as the spec's
      //    structural input — reuses the existing canvas endpoint rather than
      //    reaching into the collaborative flow state from here.
      const canvasRes = await fetch(`/api/projects/${projectId}/canvas`)
      if (!canvasRes.ok) throw new Error(`Canvas fetch failed: ${canvasRes.status}`)
      const canvas = (await canvasRes.json()) as {
        nodes?: unknown[]
        edges?: unknown[]
      }

      // 2) Trigger the generate-spec task. Access is derived server-side from
      //    the roomId + authenticated user; projectId is never trusted there.
      const res = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: projectId,
          nodes: canvas.nodes ?? [],
          edges: canvas.edges ?? [],
          chatHistory,
        }),
      })
      if (!res.ok) throw new Error(`Trigger failed: ${res.status}`)
      const { runId } = (await res.json()) as { runId?: string }
      if (!runId) throw new Error("Malformed response")

      // 3) Mint a run-scoped public token so we can subscribe in realtime.
      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status}`)
      const { token } = (await tokenRes.json()) as { token?: string }
      if (!token) throw new Error("Malformed token response")

      setRun({ id: runId, token })
    } catch {
      setGenError("Couldn't start spec generation. Please try again.")
    } finally {
      setIsStarting(false)
    }
  }

  const previewSpec = useMemo(() => {
    if (!previewId || !specs) return null
    const found = specs.find((spec) => spec.id === previewId)
    if (!found) return null
    return {
      id: found.id,
      filename: specFilename(found.id),
      createdAt: found.createdAt,
    }
  }, [previewId, specs])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button
        type="button"
        onClick={() => void generateSpecRun()}
        disabled={isBusy}
        className="w-full bg-primary text-white hover:bg-primary/80 disabled:opacity-60"
      >
        {isBusy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {isBusy ? "Generating…" : "Generate Spec"}
      </Button>

      {/* Realtime progress while a run is active. */}
      {isBusy ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.06] px-3 py-2 text-xs text-primary"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">{statusText}</span>
        </div>
      ) : null}

      {/* Last generation error, if any. */}
      {genError ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          <span>{genError}</span>
        </div>
      ) : null}

      {specs === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading specs…
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <TriangleAlert className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load specs.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadSpecs()}>
            Retry
          </Button>
        </div>
      ) : specs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No specs yet.</p>
          <p className="max-w-[15rem] text-xs text-muted-foreground/70">
            Generated specs for this project will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {specs.map((spec) => (
            <Card
              key={spec.id}
              className="gap-3 border-border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <button
                type="button"
                onClick={() => setPreviewId(spec.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    {specFilename(spec.id)}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatSpecDate(spec.createdAt)}
                  </p>
                </div>
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => downloadSpec(projectId, spec.id)}
              >
                <Download />
                Download
              </Button>
            </Card>
          ))}
        </div>
      )}

      <SpecPreviewModal
        projectId={projectId}
        spec={previewSpec}
        onClose={() => setPreviewId(null)}
        onDownload={(spec) => downloadSpec(projectId, spec.id)}
      />
    </div>
  )
}

export function AiSidebar({
  isOpen,
  onClose,
  projectId,
  aiStatus,
  onThinkingChange,
}: AiSidebarProps) {
  return (
    <aside
      className={`absolute top-12 right-0 z-40 flex h-[calc(100%-3rem)] w-96 flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header — subtle accent wash + gradient bot badge. */}
      <div className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/[0.08] via-transparent to-[#62C073]/[0.08] px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#62C073] text-neutral-950 shadow-sm">
            <Bot className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">
              AI Workspace
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Collaborate with Ghost AI
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X />
        </Button>
      </div>

      {/* Tabbed layout. */}
      <Tabs
        defaultValue="architect"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="m-3 w-[calc(100%-1.5rem)] shrink-0">
          <TabsTrigger value="architect" className={TAB_TRIGGER_CLASS}>
            AI Architect
          </TabsTrigger>
          <TabsTrigger value="specs" className={TAB_TRIGGER_CLASS}>
            Specs
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="architect"
          className="flex min-h-0 flex-col data-[state=inactive]:hidden"
        >
          <ArchitectTab
            projectId={projectId}
            aiStatus={aiStatus}
            onThinkingChange={onThinkingChange}
          />
        </TabsContent>
        <TabsContent
          value="specs"
          className="flex min-h-0 flex-col data-[state=inactive]:hidden"
        >
          <SpecsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
