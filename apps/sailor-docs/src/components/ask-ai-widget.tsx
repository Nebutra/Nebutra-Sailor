"use client";

/**
 * Docs assistant chat widget. Restores the AI chat feature dropped from this
 * bundle when it moved to a pure static export (dd792c5aa) — the old
 * `src/app/api/chat/route.ts` never had UI wired to it in this repo's
 * history (git-checked: no chat component existed alongside it), so this is
 * new UI calling the restored gateway endpoint
 * (backends/gateway/src/routes/docs/chat.ts) via `src/lib/gateway-client.ts`.
 *
 * Hides entirely when NEXT_PUBLIC_GATEWAY_URL wasn't baked into this build,
 * and falls back to a "not configured" notice if the gateway answers that
 * way (no LLM provider key set) — see `isGatewayConfigured()`.
 */
import { Cross, Message, PaperAirplane } from "@nebutra/icons";
import { useEffect, useRef, useState } from "react";
import { askDocsAssistant, type ChatMessage, isGatewayConfigured } from "@/lib/gateway-client";

export function AskAiWidget() {
  const [configured, setConfigured] = useState(isGatewayConfigured());
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfigured(isGatewayConfigured());
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!configured) return null;

  async function send() {
    const content = input.trim();
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setPending(true);
    setNotice(null);

    const result = await askDocsAssistant(next);
    if (result.configured) {
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } else {
      setNotice(result.message);
    }
    setPending(false);
  }

  return (
    <div className="fixed bottom-4 end-4 z-50">
      {open ? (
        <div className="flex h-[28rem] w-80 flex-col rounded-xl border bg-fd-card text-fd-card-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">Ask the docs</p>
            <button
              type="button"
              aria-label="Close docs assistant"
              className="rounded-md p-1 text-fd-muted-foreground hover:bg-fd-accent"
              onClick={() => setOpen(false)}
            >
              <Cross className="size-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-fd-muted-foreground">
                Ask a question about Nebutra Sailor — answered from the docs.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript, never reordered.
                key={i}
                className={m.role === "user" ? "text-fd-foreground" : "text-fd-muted-foreground"}
              >
                <span className="font-medium">{m.role === "user" ? "You: " : "Docs: "}</span>
                {m.content}
              </div>
            ))}
            {pending && <p className="text-fd-muted-foreground">Thinking…</p>}
            {notice && <p className="text-fd-muted-foreground">{notice}</p>}
          </div>
          <form
            className="flex items-center gap-2 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-md border bg-fd-secondary px-2 py-1.5 text-sm text-fd-secondary-foreground placeholder:text-fd-muted-foreground"
              disabled={pending}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={pending || !input.trim()}
              className="rounded-md p-1.5 text-fd-muted-foreground hover:bg-fd-accent disabled:opacity-50"
            >
              <PaperAirplane className="size-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border bg-fd-card px-4 py-2 text-sm font-medium text-fd-card-foreground shadow-lg hover:bg-fd-accent"
        >
          <Message className="size-4" />
          Ask AI
        </button>
      )}
    </div>
  );
}
