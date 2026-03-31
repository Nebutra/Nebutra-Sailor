"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "../AnimateIn";
import { AGENT_CARDS } from "./data";
import { PipelineComparison } from "./PipelineComparison";
import { TerminalSnippet } from "./TerminalSnippet";

export function AgenticEngineeringSection() {
  const t = useTranslations("agentic");

  return (
    <section className="w-full bg-background py-24 md:py-32 relative overflow-hidden border-y border-border/40">
      {/* High-tech Abstract Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Ambient glows */}
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

        {/* Agent pipeline Bento grid */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="rounded-[2rem] border border-border/50 bg-border/50 gap-px grid grid-cols-1 md:grid-cols-3 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 relative mb-20 md:mb-32"
        >
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--brand-tertiary)]/5 via-transparent to-[var(--status-success)]/5 pointer-events-none" />

          {AGENT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <AnimateIn
                preset="fadeUp"
                key={card.titleKey}
                className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden h-full"
              >
                {/* Corner spotlight */}
                <div
                  className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none z-0"
                  style={{ backgroundColor: card.accent }}
                />

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm mb-6 transition-transform duration-300 group-hover:scale-110 relative z-10 group-hover:shadow-md">
                  <Icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>

                <h4 className="relative z-10 text-[19px] font-bold tracking-tight text-foreground mb-3 leading-snug">
                  {t(card.titleKey)}
                </h4>

                <p className="text-[15px] text-muted-foreground font-medium leading-[1.7] mb-8 relative z-10 flex-1">
                  {t(card.descKey)}
                </p>

                <TerminalSnippet tokens={card.tokens} />
              </AnimateIn>
            );
          })}
        </AnimateInGroup>

        {/* Pipeline comparison */}
        <PipelineComparison
          traditionalLabel="Traditional"
          traditionalContent={t("compTraditional")}
          sailorContent={t("compSailor")}
          accentVar="var(--brand-tertiary)"
        />
      </div>
    </section>
  );
}

AgenticEngineeringSection.displayName = "AgenticEngineeringSection";
