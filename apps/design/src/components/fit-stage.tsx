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

export function FitStage({ children }: { children: React.ReactNode }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.5);

  React.useEffect(() => {
    const f = frame.current;
    const i = inner.current;
    if (!f || !i || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const w = i.offsetWidth;
      const h = i.offsetHeight;
      if (!w || !h) return;
      const s = Math.min((f.clientWidth - PAD * 2) / w, (f.clientHeight - PAD * 2) / h, MAX_SCALE);
      setScale(Math.max(0.2, s));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(f);
    ro.observe(i);
    fit();
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="relative flex h-[220px] items-center justify-center overflow-hidden bg-background [contain:paint] [transform:translateZ(0)]"
      ref={frame}
    >
      <div
        className="pointer-events-none w-max max-w-[560px] shrink-0"
        inert
        ref={inner}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
