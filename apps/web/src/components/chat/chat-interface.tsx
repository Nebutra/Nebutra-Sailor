"use client";

import { useChat } from "@ai-sdk/react";
import { AnimateIn } from "@nebutra/ui/components";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Loader2, Send, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { PromptSuggestions } from "./prompt-suggestions";

const MAX_TEXTAREA_ROWS = 5;
// Tailwind text-sm leading-relaxed ≈ 22px. Used as a fallback when scrollHeight
// math is not available (e.g. SSR / first paint). Real height clamping happens
// against `scrollHeight` measured at runtime.
const APPROX_LINE_HEIGHT_PX = 22;

function MessageBody({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type !== "text") return null;
        if (isUser) {
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {part.text}
            </div>
          );
        }
        return (
          <div key={i} className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            <Streamdown>{part.text}</Streamdown>
          </div>
        );
      })}
    </>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-3 text-blue-11 dark:bg-blue-9/20 dark:text-blue-9"
            : "bg-neutral-3 text-neutral-11 dark:bg-white/10 dark:text-white/70"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-blue-9 text-white dark:bg-blue-9"
            : "bg-neutral-3 text-neutral-12 dark:bg-white/10 dark:text-white"
        }`}
      >
        <MessageBody message={message} />
      </div>
    </div>
  );
}

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-resize the textarea up to MAX_TEXTAREA_ROWS, clamping height.
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

  function submit() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    sendMessage({ text });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter alone → submit; Shift+Enter → newline (default behavior).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleSuggestionSelect(prompt: string) {
    if (isStreaming) return;
    sendMessage({ text: prompt });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-black/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-7 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-10 dark:text-cyan-9" />
          <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
            Sailor AI Assistant
          </h2>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            aria-label="Clear conversation"
            onClick={() => setMessages([])}
            className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <AnimateIn preset="fade">
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex flex-col items-center">
                <Bot className="h-12 w-12 text-neutral-7 dark:text-white/20" />
                <h3 className="mt-4 text-sm font-medium text-neutral-12 dark:text-white">
                  How can I help you?
                </h3>
                <p className="mt-1 max-w-sm text-sm text-neutral-11 dark:text-white/70">
                  Ask me anything about your SaaS platform, data, or features.
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
            placeholder="Type a message..."
            disabled={isStreaming}
            className="flex-1 resize-none rounded-lg border border-neutral-7 bg-neutral-2 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 focus:border-[var(--blue-9)] focus:outline-none focus:ring-1 focus:ring-[var(--blue-9)] disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50 dark:focus:border-cyan-9 dark:focus:ring-cyan-9"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
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
