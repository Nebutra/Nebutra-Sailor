"use client";

import { ArrowUp } from "@nebutra/icons";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/mock/queries";
import { useUiStore } from "@/stores/ui-store";

/** The only call-to-action on Home. A prompt creates a workspace and opens the composer with it (A). */
export function PromptDropZone() {
  const router = useRouter();
  const setAgent = useUiStore((s) => s.setAgent);
  const [value, setValue] = useState("");
  const [over, setOver] = useState(false);

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
        "relative rounded-xl border bg-popover transition-colors",
        over ? "border-[hsl(var(--ring))]" : "border-border",
      ].join(" ")}
    >
      <Textarea
        aria-label="Describe what you are making"
        placeholder="Describe it, paste or drop here…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={3}
        className="resize-none border-0 bg-transparent px-5 py-4 pr-14 text-body shadow-none"
      />
      <div className="absolute right-3 bottom-3">
        <Button
          type="button"
          size="sm"
          shape="circle"
          iconSize="md"
          aria-label="Start"
          onClick={() => void submit()}
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </div>
  );
}
