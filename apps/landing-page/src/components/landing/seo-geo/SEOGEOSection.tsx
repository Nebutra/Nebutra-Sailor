"use client";

import { BarChart3, Globe, Languages, Search, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type * as React from "react";
import type { ComponentType } from "react";
import { AnimateIn, AnimateInGroup } from "../AnimateIn";

interface FeatureCard {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  titleKey: string;
  descKey: string;
  accentColor: string;
}

const SEO_CARDS: FeatureCard[] = [
  {
    icon: Search,
    titleKey: "card1Title",
    descKey: "card1Desc",
    accentColor: "var(--brand-primary)",
  },
  {
    icon: Sparkles,
    titleKey: "card2Title",
    descKey: "card2Desc",
    accentColor: "var(--brand-accent)",
  },
  {
    icon: Languages,
    titleKey: "card3Title",
    descKey: "card3Desc",
    accentColor: "var(--brand-tertiary)",
  },
];

const GEO_CARDS: FeatureCard[] = [
  {
    icon: Zap,
    titleKey: "card4Title",
    descKey: "card4Desc",
    accentColor: "var(--status-success)",
  },
  {
    icon: BarChart3,
    titleKey: "card5Title",
    descKey: "card5Desc",
    accentColor: "var(--brand-primary)",
  },
  {
    icon: Globe,
    titleKey: "card6Title",
    descKey: "card6Desc",
    accentColor: "var(--brand-accent)",
  },
];

const STATS = [
  { valueKey: "stat1Value", labelKey: "stat1Label" },
  { valueKey: "stat2Value", labelKey: "stat2Label" },
  { valueKey: "stat3Value", labelKey: "stat3Label" },
  { valueKey: "stat4Value", labelKey: "stat4Label" },
];

export function SEOGEOSection() {
  const t = useTranslations("seoGeo");

  return (
    <section
      id="seo-geo"
      className="relative w-full overflow-hidden bg-background py-24 md:py-32 border-y border-border/40"
    >
      {/* High-tech Abstract Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute -top-40 left-1/2 w-[800px] h-[400px] -translate-x-1/2 bg-primary/10 blur-[120px] rounded-[100%] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-[var(--brand-accent)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        {/* Header Section */}
        <AnimateIn preset="fadeUp" inView className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-muted/40 backdrop-blur-md px-3 py-1 mb-8 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-[0.15em] text-foreground uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black tracking-tighter text-foreground leading-[1.05] mb-6 text-balance">
            {t("headline")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
            {t("subheadline")}
          </p>
        </AnimateIn>

        {/* Console / Dashboard Metric Header */}
        <AnimateIn preset="fadeUp" inView className="mt-16 sm:mt-24 w-full">
          <div className="mx-auto w-full rounded-[2rem] border border-border/50 bg-background/50 backdrop-blur-2xl p-1.5 shadow-2xl relative overflow-hidden ring-1 ring-border/10">
            {/* Top highlight line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Internal 1px divided grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 bg-border/60 gap-px rounded-[1.75rem] overflow-hidden">
              {STATS.map((stat) => (
                <div
                  key={stat.valueKey}
                  className="group relative flex flex-col items-center justify-center bg-background p-8 md:p-10 transition-colors hover:bg-muted/30"
                >
                  <span className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent transition-transform duration-500 group-hover:scale-105 group-hover:text-foreground">
                    {t(stat.valueKey as any)}
                  </span>
                  <span className="mt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                    {t(stat.labelKey as any)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* High-density Bento Box */}
        <div className="mt-20 md:mt-32 w-full">
          {/* Section labels mapped elegantly */}
          <AnimateIn
            preset="fadeUp"
            inView
            className="mb-8 flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h3 className="text-sm font-bold tracking-widest uppercase text-foreground">
                {t("seoLabel")} & {t("geoLabel")} Architecture
              </h3>
            </div>
          </AnimateIn>

          <AnimateInGroup
            inView
            stagger="normal"
            className="rounded-[2rem] border border-border/50 bg-border/50 gap-px grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 relative"
          >
            {/* Inner dynamic background for the whole bento */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-[var(--brand-accent)]/5 pointer-events-none" />

            {[...SEO_CARDS, ...GEO_CARDS].map((card, idx) => {
              const Icon = card.icon;
              return (
                <AnimateIn
                  preset="fadeUp"
                  key={card.titleKey}
                  className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden h-full min-h-[280px]"
                >
                  {/* Subtle corner glow on hover */}
                  <div
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[var(--card-glow,var(--brand-primary))]/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ "--card-glow": card.accentColor } as React.CSSProperties}
                  />

                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                    <Icon className="h-6 w-6" style={{ color: card.accentColor }} />
                  </div>

                  <h4 className="relative z-10 text-[19px] font-bold tracking-tight text-foreground mb-3 leading-snug">
                    {t(card.titleKey as any)}
                  </h4>

                  <p className="relative z-10 text-[15px] text-muted-foreground font-medium leading-[1.7] flex-1">
                    {t(card.descKey as any)}
                  </p>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>

        {/* Benchmarks / Data Pipeline Visualization */}
        <AnimateIn preset="fadeUp" inView className="mt-20 md:mt-32 w-full">
          <div className="rounded-[2rem] border border-border/50 bg-background/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 md:gap-6 w-full ring-1 ring-border/10">
            {/* Traditional Pipeline (Broken/Slow) */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  {t("compTraditionalLabel")}
                </h4>
              </div>
              <div className="h-full rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 flex flex-col justify-center">
                <p className="text-[15px] font-mono text-muted-foreground/80 leading-relaxed">
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
                className="w-full h-8 flex-none text-border/50"
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
                {/* Bottom route (Sailor) */}
                <path
                  d="M0 24 H100"
                  stroke="var(--brand-primary)"
                  strokeWidth="2.5"
                  className="shadow-lg"
                  strokeDasharray="100 100"
                  strokeDashoffset="0"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="200;0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </path>
                {/* Data Nodes */}
                <circle cx="50" cy="8" r="3" fill="currentColor" className="opacity-40" />
                <circle
                  cx="50"
                  cy="24"
                  r="5"
                  fill="var(--brand-primary)"
                  className="animate-pulse shadow-xl"
                />
              </svg>
            </div>

            {/* Nebutra Sailor Pipeline (Fast/Direct) */}
            <div className="flex-1 w-full flex flex-col gap-4 relative group">
              <div className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
              <div className="flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] animate-pulse" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                  Nebutra Sailor
                </h4>
              </div>
              <div className="h-full rounded-2xl border border-primary/30 bg-background/90 p-6 shadow-xl relative overflow-hidden flex flex-col justify-center transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <p className="relative z-10 text-[16px] text-foreground font-medium leading-relaxed">
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

SEOGEOSection.displayName = "SEOGEOSection";
