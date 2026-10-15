"use client";

/**
 * Scale a demo to fill its preview frame, centred — the shadcn blocks / Geist
 * overview treatment. A fixed scale left small demos (Copy Button, Split
 * Button) as a speck in a blank 220px frame and still clipped large ones. This
 * measures the demo at its natural size and picks the largest scale that fits,
 * capped so a single button is not blown up past legibility.
 *
 * The frame carries `transform` and `contain: paint`, so anything the demo
 * positions `fixed` is laid out against the card and clipped to it rather than
 * the viewport.
 */
import * as React from "react";

const MAX_SCALE = 1.25;
const PAD = 24;

/** The width a demo lays out at — a narrow article column, which is what they were written for. */
const STAGE_WIDTH = 560;

/**
 * Horizontal extent the demo's content actually occupies. Intrinsic sizing
 * (`width: max-content`) cannot be used: a row of buttons whose labels carry
 * `min-w-0 truncate` reports a tiny max-content and the labels truncated to
 * "C.." — so the demo lays out at a real column width and we measure what it drew.
 */
function contentBox(root: HTMLElement): { left: number; width: number } {
  const origin = root.getBoundingClientRect();
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    // Only boxes that paint something or hold text count toward the extent.
    const paints =
      el.childElementCount === 0 ||
      cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      cs.borderTopWidth !== "0px" ||
      cs.boxShadow !== "none";
    if (!paints) continue;
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
  }
  if (!Number.isFinite(left)) return { left: 0, width: origin.width };
  return { left: left - origin.left, width: right - left };
}

export function FitStage({ children }: { children: React.ReactNode }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState({ scale: 0.5, dx: 0 });

  React.useEffect(() => {
    const f = frame.current;
    const i = inner.current;
    if (!f || !i || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      // Measure unscaled, then apply.
      const prev = i.style.transform;
      i.style.transform = "none";
      const h = i.offsetHeight;
      const box = contentBox(i);
      i.style.transform = prev;
      if (!box.width || !h) return;
      const scale = Math.max(
        0.2,
        Math.min((f.clientWidth - PAD * 2) / box.width, (f.clientHeight - PAD * 2) / h, MAX_SCALE),
      );
      // Shift so the drawn content, not the 560px column, sits in the centre.
      const dx = STAGE_WIDTH / 2 - (box.left + box.width / 2);
      setFit({ scale, dx });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(f);
    ro.observe(i);
    const mo = new MutationObserver(measure);
    mo.observe(i, { childList: true, subtree: true });
    measure();
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      className="relative flex h-[220px] items-center justify-center overflow-hidden bg-background [contain:paint] [transform:translateZ(0)]"
      ref={frame}
    >
      <div
        className="pointer-events-none shrink-0"
        inert
        ref={inner}
        style={{ width: STAGE_WIDTH, transform: `scale(${fit.scale}) translateX(${fit.dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
