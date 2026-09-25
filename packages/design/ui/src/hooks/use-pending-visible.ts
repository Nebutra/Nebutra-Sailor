"use client";

import * as React from "react";
import { interaction } from "../tokens/components/interaction";

/**
 * Whether a pending indicator should be on screen right now.
 *
 * A spinner that flashes for 80ms reads as a glitch, and one that appears and
 * disappears inside 200ms reads as jank. So: stay hidden until the wait is
 * noticeable (`showDelayMs`), and once shown, stay long enough to be read
 * (`minVisibleMs`) even if the work finished in between. Defaults come from the
 * interaction contract (Vercel Web Interface Guidelines).
 *
 *   const visible = usePendingVisible(isPending);
 *   return visible ? <Spinner /> : null;
 */
export function usePendingVisible(
  pending: boolean,
  {
    showDelayMs = interaction.pending.showDelayMs,
    minVisibleMs = interaction.pending.minVisibleMs,
  }: { showDelayMs?: number; minVisibleMs?: number } = {},
): boolean {
  const [visible, setVisible] = React.useState(false);
  const shownAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (pending) {
      if (visible) return;
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, showDelayMs);
      return () => clearTimeout(timer);
    }
    if (!visible) return;
    const elapsed = Date.now() - (shownAt.current ?? 0);
    const timer = setTimeout(
      () => {
        shownAt.current = null;
        setVisible(false);
      },
      Math.max(0, minVisibleMs - elapsed),
    );
    return () => clearTimeout(timer);
  }, [pending, visible, showDelayMs, minVisibleMs]);

  return visible;
}
