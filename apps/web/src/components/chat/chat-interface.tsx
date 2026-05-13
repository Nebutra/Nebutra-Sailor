"use client";

import { useChat } from "@ai-sdk/react";
import {
  Warning as AlertCircle,
  Robot as Bot,
  Check,
  Copy,
  Database,
  LoaderCircle as Loader2,
  type Icon as LucideIcon,
  Message as MessageSquare,
  Plus,
  RotateCounterClockwise as RotateCcw,
  MagnifyingGlass as Search,
  PaperAirplane as Send,
  Trash as Trash2,
  User,
  Workflow,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { MessageContent, toast } from "@nebutra/ui/primitives";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PromptSuggestions } from "./prompt-suggestions";

const MAX_TEXTAREA_ROWS = 5;
const APPROX_LINE_HEIGHT_PX = 22;

type ChatMode = "chat" | "data" | "workflow" | "search";

const MODE_META: Record<ChatMode, { label: string; icon: LucideIcon; accentClass: string }> = {
  chat: {
    label: "Chat",
    icon: MessageSquare,
    accentClass:
      "border-blue-7 bg-blue-2 text-blue-11 dark:border-blue-7/60 dark:bg-blue-2/25 dark:text-blue-9",
  },
  data: {
    label: "Data",
    icon: Database,
    accentClass:
      "border-cyan-7 bg-cyan-2 text-cyan-11 dark:border-cyan-7/60 dark:bg-cyan-2/25 dark:text-cyan-9",
  },
  workflow: {
    label: "Workflow",
    icon: Workflow,
    accentClass:
      "border-green-7 bg-green-2 text-green-11 dark:border-green-7/60 dark:bg-green-2/25 dark:text-green-9",
  },
  search: {
    label: "Search",
    icon: Search,
    accentClass:
      "border-neutral-8 bg-neutral-2 text-neutral-12 dark:border-white/30 dark:bg-white/10 dark:text-white",
  },
};

const KNOWN_MODES: ReadonlySet<string> = new Set(Object.keys(MODE_META));

function resolveMode(input: string | null | undefined): ChatMode {
  if (!input || !KNOWN_MODES.has(input)) return "chat";
  return input as ChatMode;
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes; the server upserts by id so collisions are
  // detected (and 403'd) on the way through.
  return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

interface ChatInterfaceProps {
  initialSessionId?: string;
  initialMode?: string;
}

function MessageBody({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type !== "text") return null;
        if (isUser) {
          // User messages are plain text — they don't author markdown.
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {part.text}
            </div>
          );
        }
        // AI messages flow through the source-level streaming markdown renderer.
        return <MessageContent key={i}>{part.text}</MessageContent>;
      })}
    </>
  );
}

function extractText(message: UIMessage): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = extractText(message);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy", {
        description: "Clipboard access was denied by the browser.",
      });
    }
  }

  return (
    <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-3 text-blue-11 dark:bg-blue-9/20 dark:text-blue-9"
            : "bg-neutral-3 text-neutral-11 dark:bg-white/10 dark:text-white/70"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-blue-9 text-white dark:bg-blue-9"
              : "bg-neutral-3 text-neutral-12 dark:bg-white/10 dark:text-white"
          }`}
        >
          <MessageBody message={message} />
        </div>
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy message"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 text-[10px] font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:border-white/10 dark:bg-black/40 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-green-9" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatInterface({ initialSessionId, initialMode }: ChatInterfaceProps = {}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [mode, setMode] = useState<ChatMode>(resolveMode(initialMode));
  const [isLoadingSession, setIsLoadingSession] = useState(!!initialSessionId);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The server reads mode + sessionId from the request body it receives via
  // the AI SDK transport. We keep the transport stable; per-request body
  // injection happens in `sendMessage` callsites.
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  // Load existing session messages when initialSessionId is provided.
  // Visible failure: if the load errors or returns non-2xx, we surface a
  // retry banner instead of silently rendering an empty chat (the previous
  // behavior hid data-loss / network errors from the user).
  useEffect(() => {
    if (!initialSessionId) return;
    let cancelled = false;
    setIsLoadingSession(true);
    setSessionLoadError(null);

    (async () => {
      try {
        const res = await fetch(`/api/chat/sessions/${initialSessionId}`);
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `Server returned ${res.status}`);
        }
        const data = (await res.json()) as { session?: { messages?: unknown; mode?: string } };
        const raw = data?.session?.messages;
        if (Array.isArray(raw)) {
          setMessages(raw as UIMessage[]);
        }
        if (data?.session?.mode) {
          setMode(resolveMode(data.session.mode));
        }
      } catch (err) {
        if (!cancelled) {
          setSessionLoadError(err instanceof Error ? err.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) setIsLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSessionId, loadAttempt, setMessages]);

  const handleRetryLoad = useCallback(() => {
    setLoadAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight =
      Number.parseFloat(window.getComputedStyle(ta).lineHeight) || APPROX_LINE_HEIGHT_PX;
    const maxHeight = lineHeight * MAX_TEXTAREA_ROWS;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [inputValue]);

  const reflectSessionInUrl = useCallback(
    (nextId: string, nextMode: ChatMode) => {
      const url = new URL(window.location.href);
      url.searchParams.set("sessionId", nextId);
      url.searchParams.set("mode", nextMode);
      router.replace(`${url.pathname}${url.search}`);
    },
    [router],
  );

  const dispatch = useCallback(
    (text: string) => {
      if (!text || isStreaming) return;
      // Ensure we have a sessionId before sending so the server can persist
      // under a stable key (even if the client disconnects mid-stream).
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = generateSessionId();
        setSessionId(activeSessionId);
        reflectSessionInUrl(activeSessionId, mode);
      }
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK send body type is loose
      sendMessage({ text }, { body: { mode, sessionId: activeSessionId } as any });
    },
    [isStreaming, mode, reflectSessionInUrl, sendMessage, sessionId],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    setInputValue("");
    dispatch(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = inputValue.trim();
      setInputValue("");
      dispatch(text);
    }
  }

  function handleSuggestionSelect(prompt: string) {
    dispatch(prompt);
  }

  function handleNewChat() {
    setMessages([]);
    setSessionId(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("sessionId");
    router.replace(`${url.pathname}${url.search}`);
  }

  function handleModeChange(next: ChatMode) {
    if (next === mode || isStreaming) return;
    setMode(next);
    if (sessionId) {
      reflectSessionInUrl(sessionId, next);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", next);
      router.replace(`${url.pathname}${url.search}`);
    }
  }

  const currentMeta = MODE_META[mode];

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-black/30">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-7 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-10 dark:text-cyan-9" />
          <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
            Sailor AI Assistant
          </h2>
        </div>
        <div
          role="radiogroup"
          aria-label="Chat mode"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(Object.keys(MODE_META) as ChatMode[]).map((m) => {
            const meta = MODE_META[m];
            const ModeIcon = meta.icon;
            const isActive = m === mode;
            return (
              // biome-ignore lint/a11y/useSemanticElements: visual pill group — input[type=radio] cannot host icon+label children with styled focus ring
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isStreaming}
                title={meta.label}
                onClick={() => handleModeChange(m)}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? meta.accentClass
                    : "border-neutral-6 bg-neutral-1 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white"
                }`}
              >
                <ModeIcon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              aria-label="Start a new chat"
              onClick={handleNewChat}
              className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              aria-label="Clear conversation (does not delete session)"
              onClick={() => setMessages([])}
              className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {sessionLoadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-red-11" />
            <div>
              <p className="text-sm font-medium text-neutral-12 dark:text-white">
                Couldn't load this session
              </p>
              <p className="mt-0.5 max-w-sm text-xs text-neutral-10 dark:text-white/50">
                {sessionLoadError}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-2 dark:border-white/15 dark:bg-black/40 dark:text-white dark:hover:bg-white/10"
            >
              <RotateCcw className="h-3 w-3" />
              Try again
            </button>
          </div>
        ) : isLoadingSession ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-10 dark:text-white/40" />
          </div>
        ) : messages.length === 0 ? (
          <AnimateIn preset="fade">
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex flex-col items-center">
                <currentMeta.icon className="h-12 w-12 text-neutral-7 dark:text-white/20" />
                <h3 className="mt-4 text-sm font-medium text-neutral-12 dark:text-white">
                  {currentMeta.label} mode — how can I help?
                </h3>
                <p className="mt-1 max-w-sm text-sm text-neutral-11 dark:text-white/70">
                  Ask anything about your SaaS platform. The mode shapes what Sailor focuses on.
                </p>
              </div>
              <div className="w-full max-w-2xl">
                <PromptSuggestions onSelect={handleSuggestionSelect} disabled={isStreaming} />
              </div>
            </div>
          </AnimateIn>
        ) : (
          <AnimateIn preset="fadeUp">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-3 text-neutral-11 dark:bg-white/10 dark:text-white/70">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-neutral-3 px-4 py-2.5 dark:bg-white/10">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-11 dark:text-white/70" />
                    <span className="text-sm text-neutral-11 dark:text-white/70">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </AnimateIn>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-neutral-7 px-4 py-3 dark:border-white/10"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type a message… (${currentMeta.label} mode)`}
            disabled={isStreaming || isLoadingSession}
            className="flex-1 resize-none rounded-lg border border-neutral-7 bg-neutral-2 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 transition-colors focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming || isLoadingSession}
            aria-label="Send message"
            className="rounded-lg bg-blue-9 px-3 py-2 text-white transition-colors hover:bg-blue-10 disabled:opacity-50 dark:bg-cyan-9 dark:text-black dark:hover:bg-cyan-10"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
