"use client";

// Scroll-driven vertical timeline. Visual pattern adapted from Aceternity UI
// (https://ui.aceternity.com/components/timeline) — copied source, rewritten
// to honor Nebutra design system:
//   • icons: @nebutra/icons (NOT lucide-react)
//   • colors: var(--neutral-*) + var(--blue-*) / hsl(var(--primary)) tokens
//     (NOT hardcoded white/black/purple/blue Tailwind shades)
//   • borders: hairline alpha only, no 1px solid hard outlines
// The scroll-driven beam progresses from top to bottom as the user scrolls,
// sticky phase labels park in the viewport while their content scrolls past.

import { CheckCircle, Status as Circle, Clock } from "@nebutra/icons";
import { useEffect, useRef, useState } from "react";

export type PhaseStatus = "done" | "active" | "upcoming";

export interface RoadmapPhase {
  number: number;
  name: string;
  versions: string;
  funding?: string;
  status: PhaseStatus;
  vision: string;
  milestones: Array<{ label: string }>;
}

const STATUS_META: Record<PhaseStatus, { label: string; tone: string; dot: string }> = {
  done: {
    label: "Complete",
    tone: "text-[color:var(--status-success)]",
    dot: "bg-[color:var(--status-success)]",
  },
  active: {
    label: "In Progress",
    tone: "text-[color:hsl(var(--primary))]",
    dot: "bg-[color:hsl(var(--primary))]",
  },
  upcoming: {
    label: "Planned",
    tone: "text-muted-foreground",
    dot: "bg-[color:hsl(var(--border))]",
  },
};

function PhaseIcon({ status }: { status: PhaseStatus }) {
  const Icon = status === "done" ? CheckCircle : status === "active" ? Clock : Circle;
  const meta = STATUS_META[status];
  return <Icon className={`h-4 w-4 ${meta.tone}`} aria-hidden="true" />;
}

export function RoadmapTimeline({ data }: { data: RoadmapPhase[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const content = ref.current;
      const container = containerRef.current;
      if (content) setHeight(content.getBoundingClientRect().height);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startOffset = window.innerHeight * 0.15;
      const endOffset = window.innerHeight * 0.6;
      const travel = rect.height + startOffset - endOffset;
      const nextProgress = travel > 0 ? (startOffset - rect.top) / travel : 0;
      setProgress(Math.min(Math.max(nextProgress, 0), 1));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  const beamHeight = height * progress;
  const beamOpacity = Math.min(progress / 0.1, 1);

  return (
    <div ref={containerRef} className="w-full">
      <div ref={ref} className="relative mx-auto max-w-[1100px]">
        {data.map((phase) => {
          const meta = STATUS_META[phase.status];
          const isActive = phase.status === "active";
          const isUpcoming = phase.status === "upcoming";

          return (
            <div key={phase.number} className="flex justify-start gap-6 pt-10 md:gap-12 md:pt-24">
              {/* Sticky phase header — parks in viewport while content scrolls past */}
              <div className="sticky top-32 z-10 flex w-full min-w-0 max-w-xs flex-col self-start md:max-w-sm md:flex-row md:items-center">
                {/* Beam node — white pill with hairline ring, the status dot inside */}
                <div className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-[0_0_0_1px_color-mix(in_oklab,hsl(var(--foreground)),transparent_94%)] md:left-3">
                  <div className={`h-4 w-4 rounded-full ${meta.dot}`} />
                </div>
                <div className="hidden md:block md:pl-20">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Phase {phase.number}
                    <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                      <PhaseIcon status={phase.status} />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">
                    {phase.name}
                  </h3>
                  {phase.funding && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[color:hsl(var(--primary))]">
                      {phase.funding}
                    </p>
                  )}
                </div>
              </div>

              {/* Right column — phase body */}
              <div
                className={`relative w-full pl-20 pr-4 md:pl-4 ${isUpcoming ? "opacity-70" : ""}`}
              >
                {/* Mobile-only title (sticky col hidden < md) */}
                <div className="mb-3 md:hidden">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Phase {phase.number}
                    <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                      <PhaseIcon status={phase.status} />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-1 text-2xl font-semibold text-foreground">{phase.name}</h3>
                </div>

                <div
                  className={`rounded-[var(--radius-card)] p-6 transition-shadow ${
                    isActive
                      ? "bg-[color:hsl(var(--primary))]/[0.04] shadow-[0_8px_24px_-12px_rgb(0_51_254/0.25)]"
                      : "bg-muted"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold text-muted-foreground">
                      {phase.versions}
                    </span>
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                    {phase.vision}
                  </p>
                  <ul className="space-y-2">
                    {phase.milestones.map((m) => (
                      <li
                        key={m.label}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            phase.status === "done"
                              ? "text-[color:var(--status-success)]"
                              : phase.status === "active"
                                ? "text-[color:hsl(var(--primary))]"
                                : "text-[color:hsl(var(--border))]"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}

        {/* Scroll-driven beam — sits behind the phase nodes, fills as user scrolls */}
        <div
          aria-hidden="true"
          style={{ height: `${height}px` }}
          className="absolute left-8 top-0 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--border))_10%,hsl(var(--border))_90%,transparent_100%)] md:left-8"
        >
          <div
            style={{ height: `${beamHeight}px`, opacity: beamOpacity }}
            // Brand gradient progress beam — blue → cyan, matches Nebutra VI.
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-[color:hsl(var(--primary))] via-[color:var(--brand-accent)] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
