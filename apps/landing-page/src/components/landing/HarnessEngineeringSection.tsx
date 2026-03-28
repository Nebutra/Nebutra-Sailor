"use client";

import { useTranslations } from "next-intl";
import { MiniPipeline } from "@/components/ui/mockups/MiniPipeline";
import { ProgressRatchet } from "@/components/ui/mockups/ProgressRatchet";
import { TerminalMockup } from "@/components/ui/mockups/TerminalMockup";
import { HARNESS_CARDS, HARNESS_STATS } from "@/lib/constants/landing-data";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function HarnessEngineeringSection() {
  const t = useTranslations("microLanding.harness");

  return (
    <section id="harness" className="w-full bg-background py-24 md:py-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-20">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance mb-6">
            {t("headline")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("subheadline")}
          </p>
        </AnimateIn>

        {/* Stats row */}
        <AnimateIn preset="fadeUp" inView className="mb-16 md:mb-20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 md:gap-24">
            {HARNESS_STATS.map((stat) => (
              <div key={stat.valueKey} className="text-center">
                <span className="block text-6xl md:text-7xl font-black tracking-tighter bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">
                  {t(stat.valueKey as any)}
                </span>
                <span className="block mt-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {t(stat.labelKey as any)}
                </span>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* 3-column feature grid */}
        <AnimateInGroup inView stagger="normal" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HARNESS_CARDS.map((card) => (
            <AnimateIn key={card.titleKey} preset="fadeUp">
              <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-[var(--color-glass-panel,rgba(255,255,255,0.6))] dark:bg-[var(--color-glass-panel,rgba(24,24,27,0.4))] backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-elevation-high dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <card.Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    {t(card.titleKey as any)}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-base text-muted-foreground leading-relaxed mb-8">
                  {t(card.descKey as any)}
                </p>

                {/* Card-specific visual */}
                <div className="mt-auto">
                  {card.titleKey === "card1Title" && <TerminalMockup />}
                  {card.titleKey === "card2Title" && <ProgressRatchet />}
                  {card.titleKey === "card3Title" && <MiniPipeline />}
                </div>
              </article>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

HarnessEngineeringSection.displayName = "HarnessEngineeringSection";
