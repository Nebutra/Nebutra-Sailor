"use client";

// @primitive-exempt: the template chips are media pills (thumbnail + name + category), not controls; Button's control recipe does not apply.

import { ArrowUp, Sparkles } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import { useState } from "react";
import { startKey } from "@/lib/canvas-start";
import { useCreateCanvas } from "@/lib/create-canvas";
import { TEMPLATE_CHIPS } from "./launchers";

/**
 * LibTV's agent block on Home: one wide panel, a rounded prompt field in the middle, and a row of
 * template chips under it. Sending opens a new canvas with the PARA Agent composer already
 * holding the idea; a chip opens the template's canvas directly.
 */
export function AgentComposer() {
  const { create, pending, failed } = useCreateCanvas();
  const [prompt, setPrompt] = useState("");
  const ready = prompt.trim().length > 0;

  const submit = () => {
    if (!ready || pending) return;
    void create("agent", { prompt });
  };

  return (
    <section
      aria-label="PARA Agent"
      className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-7 sm:px-8"
    >
      {/* A faint accent pool behind the field, so the panel reads as the agent's, not a form. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 max-w-text rounded-full bg-cyan-9/5 blur-3xl"
      />
      <form
        className="relative mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-muted py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-neutral-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          tone="bare"
          aria-label="说出你的创意"
          placeholder="说出你的创意，或者从一个模板开始创作"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-w-0 flex-1 px-0"
        />
        <Button
          type="submit"
          shape="circle"
          size="sm"
          variant="ink"
          aria-label="发送给 PARA Agent"
          aria-busy={pending === "agent" || undefined}
          disabled={!ready || pending !== null}
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>

      <ul className="relative mt-5 flex flex-wrap justify-center gap-2.5">
        {TEMPLATE_CHIPS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              title={t.hint}
              disabled={pending !== null}
              aria-busy={pending === startKey(t.start, t.opts) || undefined}
              onClick={() => void create(t.start, t.opts)}
              className="flex h-10 items-center gap-2 rounded-full bg-muted py-1 pr-3.5 pl-1 transition-colors hover:bg-neutral-5 disabled:cursor-wait"
            >
              <img
                src={t.art}
                alt=""
                draggable={false}
                className="size-8 rounded-full object-cover"
              />
              <span className="text-body text-foreground">{t.name}</span>
              <span className="text-label text-muted-foreground">{t.category}</span>
            </button>
          </li>
        ))}
      </ul>

      {failed ? (
        <p role="status" className="relative mt-4 text-center text-label text-muted-foreground">
          画布没有建好。请先登录，再试一次。
        </p>
      ) : null}
    </section>
  );
}
