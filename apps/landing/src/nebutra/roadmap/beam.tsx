"use client";

import { useEffect, useRef } from "react";

/**
 * The timeline's progress beam. The drawing is CSS: a view timeline on
 * `.rm-timeline` scales the beam down the track as the reader moves through
 * it (site.css). This island only covers browsers without scroll-driven
 * animations, and only by observing — no scroll listener. Each phase and item
 * reports when its top crosses the middle of the viewport, and the beam fills
 * to the furthest one. Without JavaScript, without support or with reduced
 * motion, the beam is simply drawn in full: it only ever adds.
 */
export function RoadmapBeam() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const beam = ref.current;
    const root = beam?.parentElement;
    if (!beam || !root) return;
    if (CSS.supports("animation-timeline: view()")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reached = new Map<Element, number>();
    root.dataset.beam = "io";

    const io = new IntersectionObserver(
      (entries) => {
        const top = root.getBoundingClientRect().top;
        for (const entry of entries) {
          const line = entry.rootBounds?.top ?? window.innerHeight / 2;
          const box = entry.boundingClientRect;
          if (box.top > line) reached.delete(entry.target);
          else reached.set(entry.target, (entry.isIntersecting ? box.top : box.bottom) - top);
        }
        const fill = Math.max(0, ...reached.values());
        beam.style.setProperty("--rm-beam", String(Math.min(1, fill / root.offsetHeight)));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const el of root.querySelectorAll(".rm-phase, .rm-item")) io.observe(el);

    return () => {
      io.disconnect();
      delete root.dataset.beam;
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className="rm-beam pointer-events-none absolute top-1.5 bottom-0 left-[5.5px] w-px"
    />
  );
}
