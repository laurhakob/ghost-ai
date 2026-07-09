"use client"

import { useState, type KeyboardEvent } from "react"
import {
  Bot,
  Download,
  FileText,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface AiSidebarProps {
  /** Whether the sidebar is visible — controlled by the parent. */
  isOpen: boolean
  /** Collapse the sidebar. */
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
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

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "border-2 border-primary/50 bg-primary/10 text-foreground"
            : "border border-border bg-card text-primary"
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}

function ArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, role: "user", content: trimmed },
    ])
    setInput("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits, Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable chat area. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="size-6" />
            </div>
            <p className="max-w-[15rem] text-sm text-muted-foreground">
              Describe what you want to build and Ghost AI will help you shape
              the architecture.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs text-primary transition-colors hover:bg-muted/70"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Input area with an auto-resizing textarea. */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ghost AI to design something…"
            className="max-h-40 min-h-[72px] flex-1 resize-none"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send message"
            className="bg-primary text-white hover:bg-primary/80"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button
        type="button"
        className="w-full bg-primary text-white hover:bg-primary/80"
      >
        <Sparkles />
        Generate Spec
      </Button>

      {/* Static demo spec card. */}
      <Card className="gap-3 border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground">
              E-commerce Backend Spec
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              A service-oriented architecture covering catalog, cart, checkout,
              and order fulfillment with an event-driven inventory system.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="w-full"
        >
          <Download />
          Download
        </Button>
      </Card>
    </div>
  )
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      className={`absolute top-12 right-0 z-40 flex h-[calc(100%-3rem)] w-96 flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Bot className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
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
          <ArchitectTab />
        </TabsContent>
        <TabsContent
          value="specs"
          className="flex min-h-0 flex-col data-[state=inactive]:hidden"
        >
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
