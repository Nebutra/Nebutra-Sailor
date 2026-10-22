"use client";

/**
 * A playhead for demos whose pose is a function of time.
 *
 * The orchestration timeline and the spring tuner both draw "where is everything
 * at t ms". Holding t in one place is what lets the same scene be played, slowed
 * down and scrubbed: playing advances t, scrubbing sets it, and the scene never
 * has to know which happened.
 *
 * Before anything has played, t sits at the end. That is also the state under
 * reduced motion, and the state the server renders: the finished layout, with
 * the animation as something the reader opts into.
 */

import * as React from "react";
import type { Speed } from "@/components/motion-kit";
import { parseMs } from "@/lib/motion/role-frames";
import { advancePlayhead } from "@/lib/motion/timeline";

export interface Playhead {
  /** Milliseconds from the start, clamped to the duration. */
  time: number;
  running: boolean;
  /** Start playing from `from` (default: the start). */
  play: (from?: number) => void;
  /** Park the playhead at `ms`; used by the scrubber. */
  seek: (ms: number) => void;
}

export function usePlayhead(durationMs: number, speed: Speed): Playhead {
  const [time, setTime] = React.useState<number | null>(null);
  const [running, setRunning] = React.useState(false);
  const timeRef = React.useRef(0);

  const play = React.useCallback((from = 0) => {
    timeRef.current = from;
    setTime(from);
    setRunning(true);
  }, []);

  const seek = React.useCallback((ms: number) => {
    timeRef.current = ms;
    setTime(ms);
    setRunning(false);
  }, []);

  React.useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = advancePlayhead(timeRef.current, now - last, speed);
      last = now;
      if (next >= durationMs) {
        timeRef.current = durationMs;
        setTime(durationMs);
        setRunning(false);
        return;
      }
      timeRef.current = next;
      setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, durationMs]);

  return { time: Math.min(time ?? durationMs, durationMs), running, play, seek };
}

/**
 * A resolved custom property from the document root.
 *
 * The Web Animations API takes a duration and an easing string but not `var()`,
 * so a WAAPI demo that wants to follow a token has to read the token's value.
 * Reading it here keeps the demo bound to the token source instead of to a copy.
 */
export function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readTokenMs(name: string): number {
  return parseMs(readToken(name));
}
