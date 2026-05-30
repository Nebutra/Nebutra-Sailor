"use client";

// Scroll-driven vertical timeline. Visual pattern adapted from Aceternity UI
// (https://ui.aceternity.com/components/timeline) — copied source, rewritten
// to honor Nebutra design system:
//   • icons: @nebutra/icons (NOT lucide-react)
//   • colors: var(--neutral-*) + var(--blue-*) / var(--brand-gradient) tokens
//     (NOT hardcoded white/black/purple/blue Tailwind shades)
//   • borders: hairline alpha only, no 1px solid hard outlines
// The scroll-driven beam progresses from top to bottom as the user scrolls,
// sticky phase labels park in the viewport while their content scrolls past.

import { CheckCircle, Status as Circle, Clock } from "@nebutra/icons";
import { motion, useScroll, useTransform } from "framer-motion";
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
    tone: "text-[color:var(--blue-9)]",
    dot: "bg-[color:var(--blue-9)]",
  },
  upcoming: {
    label: "Planned",
    tone: "text-[color:var(--neutral-10)]",
    dot: "bg-[color:var(--neutral-7)]",
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

  useEffect(() => {
    const update = () => {
      if (ref.current) setHeight(ref.current.getBoundingClientRect().height);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 15%", "end 60%"],
  });
  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

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
              <div className="sticky top-32 z-10 flex max-w-xs flex-col self-start md:max-w-sm md:flex-row md:items-center md:w-full">
                {/* Beam node — white pill with hairline ring, the status dot inside */}
                <div className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--neutral-1)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--neutral-12),transparent_94%)] md:left-3">
                  <div className={`h-4 w-4 rounded-full ${meta.dot}`} />
                </div>
                <div className="hidden md:block md:pl-20">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-10)]">
                    Phase {phase.number}
                    <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                      <PhaseIcon status={phase.status} />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-2 text-3xl font-semibold text-[var(--neutral-12)] md:text-4xl">
                    {phase.name}
                  </h3>
                  {phase.funding && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--blue-9)]">
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
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-10)]">
                    Phase {phase.number}
                    <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                      <PhaseIcon status={phase.status} />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-1 text-2xl font-semibold text-[var(--neutral-12)]">
                    {phase.name}
                  </h3>
                </div>

                <div
                  className={`rounded-[var(--radius-card)] p-6 transition-shadow ${
                    isActive
                      ? "bg-[color:var(--blue-9)]/[0.04] shadow-[0_8px_24px_-12px_rgb(0_51_254/0.25)]"
                      : "bg-[var(--neutral-2)]"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[var(--neutral-3)] px-3 py-1 font-mono text-xs font-semibold text-[var(--neutral-11)]">
                      {phase.versions}
                    </span>
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-[var(--neutral-11)]">
                    {phase.vision}
                  </p>
                  <ul className="space-y-2">
                    {phase.milestones.map((m) => (
                      <li
                        key={m.label}
                        className="flex items-start gap-2 text-sm text-[var(--neutral-11)]"
                      >
                        <CheckCircle
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            phase.status === "done"
                              ? "text-[color:var(--status-success)]"
                              : phase.status === "active"
                                ? "text-[color:var(--blue-9)]"
                                : "text-[color:var(--neutral-7)]"
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
          className="absolute left-8 top-0 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,transparent_0%,var(--neutral-5)_10%,var(--neutral-5)_90%,transparent_100%)] md:left-8"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            // Brand gradient progress beam — blue → cyan, matches Nebutra VI.
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-[color:var(--blue-9)] via-[color:var(--cyan-9)] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
