"use client";

import { FileText, ShieldCheck, Sparkles } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import type * as React from "react";
import type { ComponentType } from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

interface AgentCard {
  icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  titleKey: "card1Title" | "card2Title" | "card3Title";
  descKey: "card1Desc" | "card2Desc" | "card3Desc";
  codeSnippet: React.ReactNode;
}

const AGENT_CARDS: AgentCard[] = [
  {
    icon: FileText,
    titleKey: "card1Title",
    descKey: "card1Desc",
    codeSnippet: (
      <>
        <span className="text-[var(--status-warning)]">CLAUDE.md</span>
        <span className="text-white/40 mx-2 font-black">{"->"}</span>
        <span className="text-white/80">Component rules, token governance, import boundaries</span>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    titleKey: "card2Title",
    descKey: "card2Desc",
    codeSnippet: (
      <>
        <span className="text-[var(--brand-tertiary)] font-semibold">7 architecture tests</span>
        <span className="text-white/40 mx-2 font-black">{"->"}</span>
        <span className="text-white/80">dependency flow, token usage, contrast ratio</span>
      </>
    ),
  },
  {
    icon: Sparkles,
    titleKey: "card3Title",
    descKey: "card3Desc",
    codeSnippet: (
      <>
        <span className="text-[var(--status-success)]">Agent reads context</span>
        <span className="text-white/40 mx-1 font-black">{"->"}</span>
        <span className="text-white/80">writes code</span>
        <span className="text-white/40 mx-1 font-black">{"->"}</span>
        <span className="text-white/80">tests pass</span>
        <span className="text-white/40 mx-1 font-black">{"->"}</span>
        <span className="text-[var(--brand-primary)] animate-pulse shadow-[0_0_10px_var(--brand-primary)]">
          ship
        </span>
      </>
    ),
  },
];

export function AgenticEngineeringSection() {
  const t = useTranslations("agentic");

  return (
    <section className="w-full bg-background py-24 md:py-32 relative overflow-hidden border-y border-border/40">
      {/* High-tech Abstract Grid Background (Silicon Valley aesthetic) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Subtle ambient glows */}
      <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] bg-[var(--brand-tertiary)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-[var(--status-success)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="fadeUp" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-24">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-muted/40 backdrop-blur-md px-3 py-1 mb-8 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-tertiary)] animate-pulse shadow-[0_0_8px_var(--brand-tertiary)]" />
            <span className="text-xs font-bold tracking-[0.15em] text-foreground uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter text-foreground text-balance mb-6 leading-[1.05]">
            {t("headline")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
            {t("subheadline")}
          </p>
        </AnimateIn>

        {/* Agent pipeline High-Density Bento */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="rounded-[2rem] border border-border/50 bg-border/50 gap-px grid grid-cols-1 md:grid-cols-3 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 relative mb-20 md:mb-32"
        >
          {/* Inner dynamic background for the whole bento */}
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--brand-tertiary)]/5 via-transparent to-[var(--status-success)]/5 pointer-events-none" />

          {AGENT_CARDS.map((card, idx) => {
            const Icon = card.icon;
            // Define specific accent colors for the corner spotlight glows
            const accent =
              idx === 0
                ? "var(--status-warning)"
                : idx === 1
                  ? "var(--brand-tertiary)"
                  : "var(--brand-primary)";

            return (
              <AnimateIn
                preset="fadeUp"
                key={card.titleKey}
                className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden h-full"
              >
                {/* Subtle corner spotlight glow on hover */}
                <div
                  className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none z-0"
                  style={{ backgroundColor: accent }}
                />

                {/* Icon + title */}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm mb-6 transition-transform duration-300 group-hover:scale-110 relative z-10 group-hover:shadow-md">
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>

                <h4 className="relative z-10 text-[19px] font-bold tracking-tight text-foreground mb-3 leading-snug">
                  {t(card.titleKey)}
                </h4>

                {/* Description */}
                <p className="text-[15px] text-muted-foreground font-medium leading-[1.7] mb-8 relative z-10 flex-1">
                  {t(card.descKey)}
                </p>

                {/* Geek Terminal mini code snippet */}
                <div className="w-full mt-auto relative z-10 rounded-xl border border-white/10 dark:border-white/5 bg-zinc-950/90 shadow-2xl overflow-hidden group-hover:border-white/20 transition-colors">
                  {/* MacOS Terminal header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-black/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_2px_4px_rgba(239,68,68,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_2px_4px_rgba(234,179,8,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_2px_4px_rgba(34,197,94,0.3)]" />
                    <div className="ml-2 text-[9px] font-mono tracking-widest text-zinc-500 uppercase">
                      bash — node — workspace
                    </div>
                  </div>
                  {/* Syntax Box */}
                  <div className="p-4 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]">
                    <code className="block font-mono text-[11px] sm:text-xs leading-[1.8] break-words">
                      <span className="text-zinc-500 mr-2 select-none">$</span>
                      {card.codeSnippet}
                    </code>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>

        {/* Comparison Visualizer Panel */}
        <AnimateIn preset="fadeUp" inView className="mx-auto w-full max-w-5xl">
          <div className="rounded-[2rem] border border-border/50 bg-background/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-6 w-full ring-1 ring-border/10">
            {/* Traditional Developer Pipeline (Broken/Slow) */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  Traditional
                </h4>
              </div>
              <div className="h-full rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 flex flex-col justify-center">
                <p className="text-[14px] font-mono text-muted-foreground/70 leading-relaxed text-balance">
                  {t("compTraditional")}
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
              >
                {/* Top route (Traditional) */}
                <path
                  d="M0 8 H100"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="opacity-40"
                />

                {/* Bottom route (Sailor Agentic) */}
                <path
                  d="M0 24 H100"
                  stroke="var(--brand-tertiary)"
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

                {/* Data Nodes */}
                <circle cx="50" cy="8" r="3" fill="currentColor" className="opacity-40" />
                <circle
                  cx="50"
                  cy="24"
                  r="5"
                  fill="var(--brand-tertiary)"
                  className="animate-pulse"
                />
              </svg>
            </div>

            {/* Nebutra Sailor Agentic Pipeline (Fast/Automated) */}
            <div className="flex-1 w-full flex flex-col gap-4 relative group">
              <div className="absolute -inset-8 rounded-[3rem] bg-[var(--brand-tertiary)]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
              <div className="flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-[var(--brand-tertiary)] shadow-[0_0_10px_var(--brand-tertiary)] animate-pulse" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-tertiary)]">
                  Sailor
                </h4>
              </div>
              <div className="h-full rounded-2xl border border-[var(--brand-tertiary)]/30 bg-background/90 p-6 shadow-xl relative overflow-hidden flex flex-col justify-center transition-all duration-300 group-hover:border-[var(--brand-tertiary)]/50">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-tertiary)]/5 via-transparent to-transparent pointer-events-none" />
                <p className="relative z-10 text-[15px] text-foreground font-medium leading-relaxed text-balance">
                  {t("compSailor")}
                </p>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

AgenticEngineeringSection.displayName = "AgenticEngineeringSection";
