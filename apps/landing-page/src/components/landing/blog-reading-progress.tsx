"use client";

import { useEffect, useState } from "react";

function getScrollProgress(): number {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollHeight <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / scrollHeight));
}

export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setProgress(getScrollProgress()));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[100] h-0.5 w-full origin-left bg-[var(--blue-9)] transition-transform duration-150 motion-reduce:transition-none"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
