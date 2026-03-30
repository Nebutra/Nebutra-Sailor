"use client";

import { useTranslations } from "next-intl";
import type * as React from "react";
import { AnimateIn, AnimateInGroup } from "../AnimateIn";
import { PipelineComparison } from "../agentic-engineering/PipelineComparison";
import { GEO_CARDS, SEO_CARDS, STATS } from "./data";
import { StatsDashboard } from "./StatsDashboard";

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
        {/* Header */}
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

        {/* Stats dashboard */}
        <StatsDashboard stats={STATS} t={t as any} />

        {/* Bento grid */}
        <div className="mt-20 md:mt-32 w-full">
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
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-[var(--brand-accent)]/5 pointer-events-none" />

            {[...SEO_CARDS, ...GEO_CARDS].map((card) => {
              const Icon = card.icon;
              return (
                <AnimateIn
                  preset="fadeUp"
                  key={card.titleKey}
                  className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden h-full min-h-[280px]"
                >
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

        {/* Pipeline comparison — reuses shared component */}
        <div className="mt-20 md:mt-32">
          <PipelineComparison
            traditionalLabel={t("compTraditionalLabel")}
            traditionalContent={t("compTraditional")}
            sailorContent={t("compSailor")}
            accentVar="var(--brand-primary)"
          />
        </div>
      </div>
    </section>
  );
}

SEOGEOSection.displayName = "SEOGEOSection";
