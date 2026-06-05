"use client";

import { brandSpring } from "@nebutra/brand";
import { LoaderCircle, PaperAirplane, SignIn } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { signIn, useSession } from "@/lib/auth-client";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

function SoulOrb({ size = "sm", isError = false }: { size?: "sm" | "lg"; isError?: boolean }) {
  const isLg = size === "lg";
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-mono ${isError ? "text-destructive" : "text-foreground"} ${isLg ? "w-16 h-16 text-4xl" : "w-10 h-10 text-base"}`}
    >
      {isLg ? (
        <div className="flex flex-col items-center justify-center leading-none z-10 transition-transform duration-700 ease-in-out hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100">
          <svg
            aria-hidden="true"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-80"
          >
            <path
              d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 4C16.418 4 20 7.582 20 12C20 16.418 16.418 20 12 20C7.582 20 4 16.418 4 12C4 7.582 7.582 4 12 4ZM12 6C8.686 6 6 8.686 6 12C6 15.314 8.686 18 12 18C15.314 18 18 15.314 18 12C18 8.686 15.314 6 12 6Z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : (
        <span className="z-10 animate-[pulse_1s_steps(2,start)_infinite] opacity-60">{">_"}</span>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-[3px] px-4 py-3 h-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-[pulse_1.5s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatInterface({ isWidget = false }: { isWidget?: boolean }) {
  const t = useTranslations("soul");
  const { data: session, isPending } = useSession();
  const { track } = useAnalytics();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
  }, [shouldReduceMotion]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    track("soul_chat_message_sent", { message_count: nextMessages.length });
    setIsTyping(true);
    setIsStreaming(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw) as {
              type: string;
              delta?: { type: string; text: string };
            };
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.type === "text_delta" &&
              parsed.delta.text
            ) {
              const chunk = parsed.delta.text;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + chunk,
                  };
                }
                return updated;
              });
            }
          } catch (parseErr) {
            console.error("[Soul Chat] Stream parsing error:", parseErr);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: t("error"), isError: true }]);
    } finally {
      setIsStreaming(false);
      setIsTyping(false);
    }
  }, [input, isStreaming, messages, t, track]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStarter = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const starters = [t("starter1"), t("starter2"), t("starter3")];

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-6 text-center ${isWidget ? "px-4 py-6" : "px-6 py-8"}`}
      >
        <AnimateIn preset="fade">
          <SoulOrb size="lg" />
        </AnimateIn>

        <AnimateIn preset="fadeUp" delay={0.1}>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">{t("greeting_title")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t("greeting_desc")}</p>
          </div>
        </AnimateIn>

        {/* Starter chips — tease what users can ask */}
        <AnimateIn preset="fadeUp" delay={0.18}>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm pointer-events-none opacity-50 select-none">
            {starters.map((s) => (
              <span
                key={s}
                className="font-mono rounded-lg border border-border bg-muted/50 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" delay={0.26}>
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground">{t("auth_required")}</p>
            <button
              type="button"
              onClick={() =>
                signIn.social({ provider: "github", callbackURL: window.location.pathname })
              }
              className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-body-14 text-white transition-[background-color,transform] duration-200 hover:bg-gray-800 hover:scale-[1.03] active:scale-[0.97] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 will-change-transform motion-reduce:transition-colors motion-reduce:hover:scale-100 motion-reduce:active:scale-100 motion-reduce:will-change-auto"
            >
              <SignIn className="h-4 w-4" />
              {t("auth_button")}
            </button>
          </div>
        </AnimateIn>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        aria-live="polite"
        role="log"
        className={`flex-1 overflow-y-auto ${isWidget ? "px-3 py-4" : "px-5 py-6"}`}
      >
        {messages.length === 0 && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : brandSpring.default}
            className="flex h-full flex-col items-center justify-center gap-6 text-center"
          >
            <SoulOrb size="lg" />
            <div>
              <p className="text-base font-semibold text-foreground">{t("greeting_title")}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("greeting_desc")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm mt-4">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStarter(s)}
                  className="font-mono rounded-md border border-border bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground transition-[border-color,color] duration-200 hover:border-[var(--color-accent-foreground)] hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-8 max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`${msg.role}-${i}`}
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }
                }
                animate={
                  shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                transition={shouldReduceMotion ? { duration: 0 } : brandSpring.default}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "assistant" && <SoulOrb isError={msg.isError} />}
                <div
                  className={`flex items-start max-w-[85%] text-body-14 leading-relaxed whitespace-pre-wrap font-sans ${
                    msg.role === "user"
                      ? "text-foreground font-medium"
                      : msg.isError
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  <p className="pt-2">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }
              }
              animate={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              transition={shouldReduceMotion ? { duration: 0 } : brandSpring.default}
              className="flex gap-4"
            >
              <SoulOrb />
              <div className="flex items-center justify-center pt-1">
                <TypingDots />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative border-t border-border/40 bg-background/80 backdrop-blur-md px-5 py-4 pb-safe supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex items-end gap-3 rounded-xl border border-border bg-background/50 px-4 py-3 shadow-sm transition-[background-color,border-color,box-shadow] duration-300 focus-within:border-[var(--color-accent-foreground)] focus-within:shadow-md focus-within:bg-background">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            maxLength={4000}
            rows={1}
            className="flex-1 resize-none bg-transparent text-body-14 text-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none disabled:opacity-50 placeholder:text-muted-foreground font-sans min-h-[24px]"
            style={{ maxHeight: "160px" }}
            onInput={(e) => {
              // Minimalize repaints, only adjust if scrollHeight changes significantly
              const el = e.currentTarget;
              if (el.scrollHeight !== el.clientHeight) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            aria-label="Send message"
            className="shrink-0 rounded-md bg-foreground p-2 text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <PaperAirplane className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
