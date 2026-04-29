"use client";

import { AnimateIn } from "../AnimateIn";

interface PipelineComparisonProps {
  traditionalLabel: string;
  traditionalContent: string;
  sailorContent: string;
  /** CSS variable for the accent color on the "fast" pipeline side */
  accentVar?: string;
}

/**
 * Animated "Traditional vs Sailor" CI/CD pipeline comparison panel.
 * Extracted for reuse across Agentic Engineering and SEO/GEO sections.
 */
export function PipelineComparison({
  traditionalLabel,
  traditionalContent,
  sailorContent,
  accentVar = "var(--brand-tertiary)",
}: PipelineComparisonProps) {
  return (
    <AnimateIn preset="fadeUp" inView className="mx-auto w-full max-w-5xl">
      <div className="rounded-[2rem] border border-border/50 bg-background/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-6 w-full ring-1 ring-border/10">
        {/* Traditional Pipeline (Broken/Slow) */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              {traditionalLabel}
            </h4>
          </div>
          <div className="h-full rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 flex flex-col justify-center">
            <p className="text-[14px] font-mono text-muted-foreground/70 leading-relaxed text-balance">
              {traditionalContent}
            </p>
          </div>
        </div>

        {/* Pipeline SVG Divider */}
        <div className="hidden md:flex flex-col items-center justify-center relative px-6 min-w-[140px]">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-border mb-3 border border-border/50 rounded-full px-2 py-0.5 bg-background shadow-sm">
            VS
          </div>
          <svg
            className="w-full h-8 flex-none text-border/40"
            viewBox="0 0 100 32"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 8 H100"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="opacity-40"
            />
            <path
              d="M0 24 H100"
              stroke={accentVar}
              strokeWidth="2.5"
              className="shadow-lg"
              strokeDasharray="100 100"
              strokeDashoffset="0"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="200;0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx="50" cy="8" r="3" fill="currentColor" className="opacity-40" />
            <circle cx="50" cy="24" r="5" fill={accentVar} className="animate-pulse" />
          </svg>
        </div>

        {/* Sailor Pipeline (Fast/Automated) */}
        <div className="flex-1 w-full flex flex-col gap-4 relative group">
          <div
            className="absolute -inset-8 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10"
            style={{ backgroundColor: `color-mix(in srgb, ${accentVar} 10%, transparent)` }}
          />
          <div className="flex items-center gap-2 relative z-10">
            <span
              className="flex h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: accentVar,
                boxShadow: `0 0 10px ${accentVar}`,
              }}
            />
            <h4
              className="text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ color: accentVar }}
            >
              Sailor
            </h4>
          </div>
          <div
            className="h-full rounded-2xl bg-background/90 p-6 shadow-xl relative overflow-hidden flex flex-col justify-center transition-all duration-300"
            style={{
              borderColor: `color-mix(in srgb, ${accentVar} 30%, transparent)`,
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-tertiary)]/5 via-transparent to-transparent pointer-events-none" />
            <p className="relative z-10 text-[15px] text-foreground font-medium leading-relaxed text-balance">
              {sailorContent}
            </p>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}

PipelineComparison.displayName = "PipelineComparison";
