"use client";

/**
 * Shared plumbing for every motion demo on the site.
 *
 * Three things recur: a user preference that must be honoured (reduced motion),
 * a control every demo wants (0.25x playback, replay), and a trigger that fires
 * a demo once when it is actually on screen rather than while it is below the
 * fold. They live here so each demo is only its own choreography.
 *
 * A note on playing "full motion" for someone who asked for less. The global
 * reduced-motion rule in the token stylesheet strips transform transitions from
 * everything. These demos exist to show that motion, so their transitions are
 * set inline (which outranks the rule) and, under the OS preference, they do not
 * start by themselves: the reader presses Replay, which is consent to see it.
 */

import { RefreshClockwise } from "@nebutra/icons";
import { Button, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import * as React from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The OS-level preference; `false` on the server and until hydration. */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

export const SPEEDS = [1, 0.25] as const;
export type Speed = (typeof SPEEDS)[number];

/** The factor durations are multiplied by to play at `speed`. */
export const slowFactor = (speed: Speed): number => 1 / speed;

/** Style that scopes `--slow` to a subtree, which role transitions multiply by. */
export function slowStyle(speed: Speed): React.CSSProperties {
  return { ["--slow" as string]: slowFactor(speed) };
}

/**
 * The one selected value of a `type="single"` ToggleGroup, or `undefined` when
 * the group was deselected. The group types its value as `string | string[]`.
 */
export function pickOne(value: string | readonly string[]): string | undefined {
  const one = typeof value === "string" ? value : value[0];
  return one === "" ? undefined : one;
}

/** True once the element has been on screen, and stays true. */
export function useSeen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T | null>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen];
}

/**
 * True from two frames after the current `nonce` was set, false before it.
 * `enabled` gates playback.
 *
 * The value is tied to the nonce it was armed for, so the moment `nonce`
 * changes it reads false *in the same render*. Pair it with `key={nonce}` on the
 * subject: the subject then remounts at its rest pose with no transition to run,
 * and two frames later `on` flips and the full transition plays from rest. A
 * plain false -> true flip would instead first transition back toward rest and
 * be cut short, so a replay would barely move.
 */
export function usePlayback(nonce: number, enabled: boolean): boolean {
  const [armed, setArmed] = React.useState(-1);
  React.useEffect(() => {
    if (!enabled) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArmed(nonce));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [nonce, enabled]);
  return armed === nonce;
}

export function SpeedToggle({
  speed,
  onSpeedChange,
}: {
  speed: Speed;
  onSpeedChange: (speed: Speed) => void;
}) {
  return (
    <ToggleGroup
      aria-label="Playback speed"
      onValueChange={(value) => {
        const next = SPEEDS.find((s) => String(s) === value);
        if (next) onSpeedChange(next);
      }}
      size="sm"
      type="single"
      value={String(speed)}
    >
      {SPEEDS.map((s) => (
        <ToggleGroupItem key={s} value={String(s)}>
          {s === 1 ? "1×" : `${s}×`}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ReplayButton({
  onClick,
  label = "Replay",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} size="sm" type="button" variant="outline">
      <RefreshClockwise aria-hidden className="size-3.5" />
      {label}
    </Button>
  );
}

/** The row of controls above a group of demos. */
export function MotionControls({
  speed,
  onSpeedChange,
  onReplay,
  children,
}: {
  speed: Speed;
  onSpeedChange: (speed: Speed) => void;
  onReplay: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SpeedToggle onSpeedChange={onSpeedChange} speed={speed} />
      <ReplayButton onClick={onReplay} />
      {children}
    </div>
  );
}

/** Shown instead of autoplay when the OS asks for reduced motion. */
export function ReducedMotionNotice() {
  const reduced = usePrefersReducedMotion();
  if (!reduced) return null;
  return (
    <p className="m-0 rounded-[var(--radius-md)] bg-muted px-3 py-2 text-muted-foreground text-xs">
      Your system asks for reduced motion, so demos do not start by themselves. Press Replay to
      preview the full motion on purpose.
    </p>
  );
}

/** A labelled box the demos play inside. */
export function Stage({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-2xs text-muted-foreground uppercase tracking-label">{label}</span>
      <div
        className={`relative flex min-h-24 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-muted/50 p-4 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
