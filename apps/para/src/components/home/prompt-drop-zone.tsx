"use client";

import { ArrowUp } from "@nebutra/icons";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { api } from "@/mock/queries";
import { useUiStore } from "@/stores/ui-store";

/** Grow past this and the field scrolls instead, so the page below never gets pushed off-screen. */
const MAX_ROWS = 10;

/** The only call-to-action on Home. A prompt creates a workspace and opens the composer with it (A). */
export function PromptDropZone() {
  const router = useRouter();
  const setAgent = useUiStore((s) => s.setAgent);
  const [value, setValue] = useState("");
  const [over, setOver] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  /**
   * Height follows the content. The field used to be a fixed three rows, so at rest it was a large
   * empty rectangle with a placeholder stranded at the top — the composer read as a void rather
   * than as an invitation. One line at rest, growing as the thought does.
   */
  const fit = useCallback((el: HTMLTextAreaElement) => {
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS)}px`;
  }, []);

  const submit = async () => {
    const prompt = value.trim();
    const ws = await api.createWorkspace("last-animal");
    if (prompt) setAgent({ status: "composing", prompt });
    router.push(`/p/${ws.projectId}/w/${ws.id}`);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop target wrapping a focusable textarea
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void submit();
      }}
      className={[
        "flex items-end gap-2 rounded-xl border bg-popover py-2.5 pr-2.5 pl-4 transition-colors",
        over ? "border-[hsl(var(--ring))]" : "border-border",
      ].join(" ")}
    >
      <Textarea
        ref={field}
        aria-label="Describe what you are making"
        placeholder="Describe it, paste or drop here…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          fit(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={1}
        className="max-h-none min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-body shadow-none"
      />
      {/* Only appears once there is something to send: an always-lit action on an empty field is
          the brightest thing on the page pointing at nothing. */}
      <Button
        type="button"
        size="sm"
        shape="circle"
        iconSize="md"
        aria-label="Start"
        disabled={!value.trim()}
        onClick={() => void submit()}
        className="shrink-0 transition-opacity disabled:opacity-0"
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}
