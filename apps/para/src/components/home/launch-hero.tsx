"use client";

// @primitive-exempt: the 新建画布创作 card and the launcher cards are full-bleed launch cards, not controls; Button's control recipe (height, padding, radius) does not apply.

import { Plus } from "@nebutra/icons";
import { startKey } from "@/lib/canvas-start";
import { useCreateCanvas } from "@/lib/create-canvas";
import { type Launcher, MODELS, PLANNED_TAG, TOOLS } from "./launchers";

/**
 * Home's first row, in LibTV's shape: a large 新建画布创作 card on the left, a 3×2 grid on the
 * right — models on top, tools below. Every live entry creates a project and its first canvas and
 * opens it with a template, so the canvas starts with something laid out. A planned model is shown
 * but cannot be clicked.
 */
export function LaunchHero() {
  const { create, pending, failed } = useCreateCanvas();

  return (
    <section aria-label="开始创作">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <button
          type="button"
          onClick={() => void create("blank")}
          disabled={pending !== null}
          aria-busy={pending === "blank" || undefined}
          className="para-dots group relative flex h-52 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-neutral-8 disabled:cursor-wait lg:h-auto"
        >
          <CanvasLines />
          <span className="relative flex h-14 w-24 items-center justify-center rounded-xl bg-neutral-12 text-neutral-1 shadow-ambient-md transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
            <Plus className="size-6" />
          </span>
          <span className="relative font-medium text-base text-foreground">新建画布创作</span>
        </button>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...MODELS, ...TOOLS].map((l) => (
            <li key={l.id}>
              <LauncherCard
                launcher={l}
                busy={pending === startKey(l.start, l.opts)}
                disabled={pending !== null}
                onClick={() => void create(l.start, l.opts)}
              />
            </li>
          ))}
        </ul>
      </div>
      {failed ? (
        <p role="status" className="mt-3 text-label text-muted-foreground">
          画布没有建好。请先登录，再试一次。
        </p>
      ) : null}
    </section>
  );
}

function LauncherCard({
  launcher,
  busy,
  disabled,
  onClick,
}: {
  launcher: Launcher;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { name, tag, hint, icon: Icon, art, status } = launcher;
  const body = (
    <>
      {/* The card's art, faded in from the right edge so the label side stays quiet. */}
      <img
        src={art}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-45 transition-opacity duration-300 [mask-image:linear-gradient(to_right,transparent,black_70%)] group-hover:opacity-80 motion-reduce:transition-none"
      />
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-neutral-4 text-foreground">
        <Icon className="size-4" />
      </span>
      <span className="relative flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-body text-foreground">{name}</span>
        {tag ? (
          <span
            className={`shrink-0 rounded px-1.5 py-px text-meta ${
              tag === PLANNED_TAG
                ? "bg-neutral-4 text-muted-foreground"
                : "bg-cyan-9/15 text-brand-accent"
            }`}
          >
            {tag}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{hint}</span>
    </>
  );
  const shape =
    "relative flex h-24 w-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3.5 text-left";

  // A planned model is drawn in full but is not a control: no hover, no pointer, not focusable.
  // Its visible 即将上线 tag is what a screen reader reads, so it needs no ARIA of its own.
  if (status === "planned") {
    return (
      <div data-status="planned" title={hint} className={`${shape} cursor-default`}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className={`group ${shape} transition-colors hover:border-neutral-8 hover:bg-neutral-3 disabled:cursor-wait`}
    >
      {body}
    </button>
  );
}

/** Two crossing curves over the dot grid — the canvas's own texture, seen from far away. */
function CanvasLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 240"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full text-foreground opacity-10"
    >
      <path d="M0 40 C180 40 220 120 300 120 S420 200 600 200" fill="none" stroke="currentColor" />
      <path d="M0 200 C180 200 220 120 300 120 S420 40 600 40" fill="none" stroke="currentColor" />
    </svg>
  );
}
