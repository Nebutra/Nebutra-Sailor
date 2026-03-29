"use client";

import { BarChart3, Globe, Languages, Search, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { AnimateIn, AnimateInGroup } from "../AnimateIn";

interface FeatureCard {
  icon: ComponentType<{ className?: string }>;
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

function FeatureCardComponent({
  card,
  t,
}: {
  card: FeatureCard;
  t: ReturnType<typeof useTranslations>;
}) {
  const Icon = card.icon;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl p-7 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
      {/* Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl mb-4"
        style={{
          backgroundColor: `color-mix(in oklch, ${card.accentColor} 12%, transparent)`,
          color: card.accentColor,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold tracking-tight text-foreground mb-2">
        {t(card.titleKey as any)}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{t(card.descKey as any)}</p>
    </article>
  );
}

export function SEOGEOSection() {
  const t = useTranslations("seoGeo");

  return (
    <section id="seo-geo" className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 right-1/3 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[var(--brand-accent)]/5 blur-[100px] rounded-full pointer-events-none" />

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
            {STATS.map((stat) => (
              <div key={stat.valueKey} className="text-center">
                <span className="block text-5xl md:text-6xl font-black tracking-tighter bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">
                  {t(stat.valueKey as any)}
                </span>
                <span className="block mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t(stat.labelKey as any)}
                </span>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* SEO Section */}
        <AnimateIn preset="fadeUp" inView className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("seoLabel")}
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16"
        >
          {SEO_CARDS.map((card) => (
            <AnimateIn key={card.titleKey} preset="fadeUp" className="h-full">
              <FeatureCardComponent card={card} t={t} />
            </AnimateIn>
          ))}
        </AnimateInGroup>

        {/* GEO Section */}
        <AnimateIn preset="fadeUp" inView className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("geoLabel")}
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16"
        >
          {GEO_CARDS.map((card) => (
            <AnimateIn key={card.titleKey} preset="fadeUp" className="h-full">
              <FeatureCardComponent card={card} t={t} />
            </AnimateIn>
          ))}
        </AnimateInGroup>

        {/* Bottom comparison: Traditional SEO vs SEO+GEO */}
        <AnimateIn preset="fadeUp" inView className="mx-auto max-w-3xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 justify-center">
            <div className="flex-1 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                {t("compTraditionalLabel")}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("compTraditional")}
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center">
              <span className="text-xs font-black text-muted-foreground/40 uppercase">vs</span>
            </div>
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

SEOGEOSection.displayName = "SEOGEOSection";
