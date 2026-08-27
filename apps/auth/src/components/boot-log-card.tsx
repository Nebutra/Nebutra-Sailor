"use client";

import { useEffect, useMemo, useState } from "react";
import { type BootLogRecord, type BootLogSpan, bootLogBucket } from "@/content/boot-log";

const HOLD_MS = 13_000;
const FADE_MS = 500;

/** Per-bar delay of the ripple that spreads from the newly lit year. */
const RIPPLE_STEP_MS = 9;
const RIPPLE_CAP_MS = 260;

/**
 * The rotating archive entry on the sign-in panel.
 *
 * Deliberately not a card: no container, no border, no surface of its own. It
 * separates from the panel by whitespace and type weight, and aligns to the same
 * 24rem measure as the tagline above it, so the column reads as one editorial
 * block rather than a widget dropped onto a gradient.
 *
 * Under it runs the rail. Bar height is how many entries fall in that slice of
 * the archive — the record's own density, not a ruler — which is the only reason
 * a line belongs on a panel that otherwise has none. The lit bar is the entry
 * being read, and it is a bar rather than a dot on purpose: a dot on a line reads
 * as a slider handle, and nothing here can be dragged.
 *
 * The rotation is drawn server-side per request (the route is force-dynamic), so
 * the order arrives as a prop and there is nothing random to reconcile at
 * hydration. Hovering the block pauses it, because the one interaction a reader
 * actually wants here is for the paragraph to stop moving while they finish it.
 * All motion is skipped under prefers-reduced-motion; this sits beside a form
 * someone is typing into.
 */
export function BootLogCard({
  entries,
  density,
  span,
  label,
}: {
  entries: readonly BootLogRecord[];
  density: readonly number[];
  span: BootLogSpan;
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (entries.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let fade: ReturnType<typeof setTimeout> | undefined;
    const hold = setInterval(() => {
      setShown(false);
      fade = setTimeout(() => {
        setIndex((current) => (current + 1) % entries.length);
        setShown(true);
      }, FADE_MS);
    }, HOLD_MS);

    return () => {
      clearInterval(hold);
      if (fade) clearTimeout(fade);
    };
  }, [entries.length, paused]);

  const entry = entries[index];
  const peak = useMemo(() => Math.max(1, ...density), [density]);
  const lit = entry ? bootLogBucket(entry.year, density.length, span) : -1;

  if (!entry) return null;

  return (
    <section
      aria-label={label}
      className="max-w-[24rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{ transition: `opacity ${FADE_MS}ms ease` }}
        className={shown ? "opacity-100" : "opacity-0"}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {entry.stamp} · {entry.tag}
        </p>

        {/* Reserved height: the crossfade must not move the rail under it. */}
        <div className="mt-3.5 min-h-[11rem] xl:min-h-[10rem]">
          <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {entry.title}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.85] text-muted-foreground">{entry.body}</p>
          <p className="mt-2 text-[13px] leading-[1.85] text-foreground/70">{entry.coda}</p>
        </div>
      </div>

      <div aria-hidden className="mt-7">
        <div className="flex h-[18px] items-end gap-[3px]">
          {density.map((count, i) => {
            const distance = Math.abs(i - lit);
            const isLit = i === lit;
            // Neighbours catch a little of the light, so the mark reads as
            // illuminating the record rather than sitting on top of it.
            const halo = distance === 1 ? 0.45 : distance === 2 ? 0.2 : 0;
            // A year the archive says nothing about stays a hairline. The gaps
            // are part of the shape; filling them would make this a ruler again.
            const base = count === 0 ? 1 : 3 + (count / peak) * 11;
            return (
              <span
                key={`bar-${i}-${count}`}
                className="w-full origin-bottom rounded-[1px] transition-[height,background-color] duration-500 ease-out motion-reduce:transition-none"
                style={{
                  height: `${isLit ? Math.max(base, 6) + 4 : base}px`,
                  backgroundColor: isLit
                    ? "hsl(var(--primary))"
                    : halo > 0
                      ? `color-mix(in srgb, hsl(var(--primary)) ${halo * 55}%, color-mix(in srgb, hsl(var(--foreground)) 20%, transparent))`
                      : `color-mix(in srgb, hsl(var(--foreground)) ${count === 0 ? 12 : 20}%, transparent)`,
                  // The ripple: every bar waits by its distance from the newly
                  // lit one, so the change spreads outward instead of blinking.
                  transitionDelay: `${Math.min(RIPPLE_CAP_MS, distance * RIPPLE_STEP_MS)}ms`,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2.5 flex justify-between font-mono text-[9px] tracking-[0.14em] text-muted-foreground/60">
          {/* ‹ means "this decade and everything older", which is stacked in the
              first bar. A bare year would claim the archive starts there. */}
          <span>
            {span.earlier > 0 ? "‹" : ""}
            {span.from}
          </span>
          <span>{span.to}</span>
        </div>
      </div>
    </section>
  );
}
