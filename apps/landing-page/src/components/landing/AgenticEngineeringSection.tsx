"use client";

import { FileText, ShieldCheck, Sparkles } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

interface AgentCard {
  icon: ComponentType<{ size?: number; className?: string }>;
  titleKey: "card1Title" | "card2Title" | "card3Title";
  descKey: "card1Desc" | "card2Desc" | "card3Desc";
  codeSnippet: string;
}

const AGENT_CARDS: AgentCard[] = [
  {
    icon: FileText,
    titleKey: "card1Title",
    descKey: "card1Desc",
    codeSnippet: "CLAUDE.md \u2192 Component rules, token governance, import boundaries",
  },
  {
    icon: ShieldCheck,
    titleKey: "card2Title",
    descKey: "card2Desc",
    codeSnippet: "7 architecture tests \u2192 dependency flow, token usage, contrast ratio",
  },
  {
    icon: Sparkles,
    titleKey: "card3Title",
    descKey: "card3Desc",
    codeSnippet:
      "Agent reads context \u2192 writes code \u2192 tests pass \u2192 CI green \u2192 ship",
  },
];

export function AgenticEngineeringSection() {
  const t = useTranslations("agentic");

  return (
    <section className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-24">
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

        {/* Agent pipeline cards */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16"
        >
          {AGENT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <AnimateIn key={card.titleKey} preset="fadeUp" className="h-full">
                <article className="group flex h-full flex-col rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl p-8 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
                  {/* Icon + title */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      {t(card.titleKey)}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-base text-muted-foreground leading-relaxed mb-6">
                    {t(card.descKey)}
                  </p>

                  {/* Mini code snippet */}
                  <div className="mt-auto overflow-hidden rounded-xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/50 dark:bg-zinc-900/40">
                      <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80" />
                      <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80" />
                      <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80" />
                    </div>
                    <div className="p-4 bg-gradient-to-br from-background/40 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]">
                      <code className="font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed">
                        {card.codeSnippet}
                      </code>
                    </div>
                  </div>
                </article>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>

        {/* Comparison pills */}
        <AnimateIn preset="fadeUp" inView className="mx-auto max-w-3xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 justify-center">
            {/* Traditional */}
            <div className="flex-1 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                Traditional
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("compTraditional")}
              </p>
            </div>

            {/* VS divider */}
            <div className="hidden sm:flex items-center justify-center">
              <span className="text-xs font-black text-muted-foreground/40 uppercase">vs</span>
            </div>

            {/* Sailor */}
            <div className="flex-1 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-xl px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                Sailor
              </p>
              <p className="text-sm text-foreground leading-relaxed font-medium">
                {t("compSailor")}
              </p>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

AgenticEngineeringSection.displayName = "AgenticEngineeringSection";
