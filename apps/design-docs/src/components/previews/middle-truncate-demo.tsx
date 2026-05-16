"use client";

import { MiddleTruncate } from "@nebutra/ui/primitives";
import * as React from "react";

type ExampleItem = {
  className?: string;
  label: string;
  value: string;
};

const EXAMPLES = [
  {
    className: "font-medium",
    label: "Branch",
    value: "feature/redesign-dashboard-navigation-with-sidebar-improvements",
  },
  {
    label: "Preview URL",
    value: "platform-web-git-feature-redesign-dashboard-navigation-phamous.vercel.app",
  },
  {
    className: "font-medium",
    label: "Deployment ID",
    value: "dpl_8gmXTT1yJRP8UbGfXD7A3sp4RKhW",
  },
  {
    className: "font-mono",
    label: "Commit SHA",
    value: "2b0874e797d7c2a4092d0033ee0c2f0f9aef2869",
  },
  {
    label: "File path",
    value: "apps/vercel-site/app/(dashboard)/[teamSlug]/[project]/settings/page.tsx",
  },
  {
    label: "Custom domain",
    value: "api.internal.platform-observability.example.com",
  },
  {
    className: "font-medium",
    label: "Model name",
    value: "google/gemini-3.1-flash-image-preview",
  },
  {
    className: "font-medium",
    label: "Tight width",
    value: "feature/redesign-dashboard-navigation-with-sidebar-improvements",
  },
  {
    className: "font-medium",
    label: "Fits as-is",
    value: "sidebar.tsx",
  },
] as const satisfies readonly ExampleItem[];

const MAX_WIDTH = 600;

const MiddleTruncatePreview = MiddleTruncate as React.ComponentType<{
  "aria-label"?: string;
  className?: string;
  value: string;
}>;

function ExampleRow({ item, width }: { item: ExampleItem; width: number }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 rounded-[var(--radius-md)] border border-border bg-background px-4 py-3">
      <span className="text-muted-foreground text-sm">{item.label}</span>
      <span className="block min-w-0" style={{ maxWidth: width }}>
        <MiddleTruncatePreview
          value={item.value}
          className={item.className}
          aria-label={`${item.label}: ${item.value}`}
        />
      </span>
    </div>
  );
}

export function MiddleTruncateDemo() {
  const [width, setWidth] = React.useState(MAX_WIDTH);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isAnimating) return undefined;

    const duration = 4000;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = (elapsed % duration) / duration;
      const t = progress < 0.5 ? progress * 2 : 2 - progress * 2;
      setWidth(Math.round(t * MAX_WIDTH));
      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        {EXAMPLES.map((item) => (
          <ExampleRow key={item.label} item={item} width={width} />
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <label className="flex min-w-72 flex-1 flex-col gap-2">
          <span>Width</span>
          <span className="flex items-center gap-3">
            <input
              aria-label="Width"
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              max={MAX_WIDTH}
              min={0}
              onChange={(event) => setWidth(Number(event.currentTarget.value))}
              type="range"
              value={width}
            />
            <span className="min-w-16 font-mono text-muted-foreground text-sm tabular-nums">
              {width}px
            </span>
          </span>
        </label>

        <div className="flex items-center gap-2 pb-2">
          <span className="text-sm">Animate</span>
          <button
            aria-checked={isAnimating}
            aria-label="Animate width"
            className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent ${isAnimating ? "bg-primary" : "bg-input"}`}
            onClick={() => setIsAnimating((current) => !current)}
            role="switch"
            type="button"
          >
            <span
              className={`block size-5 rounded-full bg-background shadow-sm ${isAnimating ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
