"use client";

// @primitive-exempt: the hero is a full-width launch card, not a control; Button's control recipe (height, padding, radius) does not apply.

import { Plus } from "@nebutra/icons";
import { useCreateCanvas } from "@/lib/create-canvas";

/**
 * The first thing on Home: one wide card, one action. Creates a project and its first workspace
 * and opens the canvas. The dotted ground is the canvas's own texture, so the card reads as a
 * preview of where the click goes.
 */
export function NewCanvasHero() {
  const { create, pending, failed } = useCreateCanvas();
  return (
    <section aria-label="Start">
      <button
        type="button"
        onClick={() => void create("blank")}
        disabled={pending !== null}
        aria-busy={pending !== null || undefined}
        className="para-dots group flex h-56 w-full flex-col items-center justify-center gap-3 rounded-xl bg-card transition-colors hover:bg-neutral-4 disabled:cursor-wait"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
          <Plus className="size-5" />
        </span>
        <span className="font-medium text-body text-foreground">New canvas</span>
        <span className="text-label text-muted-foreground">
          {failed
            ? "The canvas could not be created. Sign in and try again."
            : "An empty canvas in a new project"}
        </span>
      </button>
    </section>
  );
}
