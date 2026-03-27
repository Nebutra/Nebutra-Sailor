"use client";

import { BookOpen, Droplet, Eye, Layers, ShieldCheck } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

interface FlowNode {
  labelKey: "flowBrand" | "flowTokens" | "flowTheme" | "flowUI";
  descKey: "flowBrandDesc" | "flowTokensDesc" | "flowThemeDesc" | "flowUIDesc";
}

const FLOW_NODES: FlowNode[] = [
  { labelKey: "flowBrand", descKey: "flowBrandDesc" },
  { labelKey: "flowTokens", descKey: "flowTokensDesc" },
  { labelKey: "flowTheme", descKey: "flowThemeDesc" },
  { labelKey: "flowUI", descKey: "flowUIDesc" },
];

interface FeatureCard {
  titleKey: "card1Title" | "card2Title" | "card3Title" | "card4Title" | "card5Title";
  descKey: "card1Desc" | "card2Desc" | "card3Desc" | "card4Desc" | "card5Desc";
  icon: typeof Layers;
}

const FEATURE_CARDS: FeatureCard[] = [
  { titleKey: "card1Title", descKey: "card1Desc", icon: Layers },
  { titleKey: "card2Title", descKey: "card2Desc", icon: Droplet },
  { titleKey: "card3Title", descKey: "card3Desc", icon: Eye },
  { titleKey: "card4Title", descKey: "card4Desc", icon: ShieldCheck },
  { titleKey: "card5Title", descKey: "card5Desc", icon: BookOpen },
];

export function DesignSystemSection() {
  const t = useTranslations("designSystem");

  return (
    <section className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-20">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance">
            {t("headline")}
          </h2>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
            {t("subheadline")}
          </p>
        </AnimateIn>

        {/* Token Flow Visualization */}
        <AnimateIn preset="fadeUp" inView className="mb-16 md:mb-20">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            {FLOW_NODES.map((node, i) => (
              <div key={node.labelKey} className="flex flex-col md:flex-row items-center">
                {/* Node card */}
                <div className="flex flex-col items-center text-center rounded-2xl border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-xl px-6 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[200px] md:w-[210px] transition-all duration-300 hover:border-primary/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                  <span className="text-sm font-bold text-foreground tracking-tight">
                    {t(node.labelKey)}
                  </span>
                  <span className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {t(node.descKey)}
                  </span>
                </div>

                {/* Arrow connector (not after last node) */}
                {i < FLOW_NODES.length - 1 && (
                  <div className="flex items-center justify-center md:mx-3 my-2 md:my-0">
                    {/* Vertical arrow (mobile) */}
                    <span className="md:hidden text-xl text-primary/60 font-light select-none">
                      ↓
                    </span>
                    {/* Horizontal arrow (desktop) */}
                    <span className="hidden md:block text-xl text-primary/60 font-light select-none">
                      →
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* Feature grid 2x2 */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <AnimateIn key={card.titleKey} preset="fadeUp">
                <article className="rounded-2xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl p-6 md:p-8 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-foreground">
                      {t(card.titleKey)}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(card.descKey)}</p>
                </article>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      </div>
    </section>
  );
}

DesignSystemSection.displayName = "DesignSystemSection";
