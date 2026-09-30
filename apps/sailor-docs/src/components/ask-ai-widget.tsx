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
import { brand } from "@nebutra/brand/metadata";
import { Cross, Message, PaperAirplane } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
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
            <Button
              type="button"
              variant="ghost"
              shape="square"
              iconSize="sm"
              aria-label="Close docs assistant"
              onClick={() => setOpen(false)}
            >
              <Cross className="size-4" />
            </Button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-fd-muted-foreground">
                Ask a question about {brand.name} Sailor — answered from the docs.
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1"
              disabled={pending}
            />
            <Button
              type="submit"
              variant="ghost"
              shape="square"
              iconSize="sm"
              aria-label="Send"
              disabled={pending || !input.trim()}
            >
              <PaperAirplane className="size-4" />
            </Button>
          </form>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          shape="circle"
          shadow="md"
          onClick={() => setOpen(true)}
          prefix={<Message className="size-4" />}
        >
          Ask AI
        </Button>
      )}
    </div>
  );
}
