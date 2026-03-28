"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { ColorScaleCard } from "./design-system/ColorScaleCard";
import { InteractiveDocsCard } from "./design-system/InteractiveDocsCard";
import { PipelineCard } from "./design-system/PipelineCard";
import { ThemeSelectorCard } from "./design-system/ThemeSelectorCard";
import { TokenGovernanceCard } from "./design-system/TokenGovernanceCard";
import { VrtCard } from "./design-system/VrtCard";

export function DesignSystemSection() {
  const t = useTranslations("designSystem");

  return (
    <section className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="w-full flex flex-col items-center justify-center mb-16 md:mb-20 text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6 opacity-0 translate-y-2 animate-[fade-in_0.5s_ease-out_forwards]">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-foreground text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.2s_forwards]">
            {t("headline")}
          </h2>
          <p className="mt-4 md:mt-6 text-sm md:text-lg text-muted-foreground text-center max-w-xl text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.4s_forwards]">
            {t("subheadline")}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 w-full max-w-[1280px] mx-auto">
          <AnimateInGroup
            stagger="normal"
            className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 w-full"
          >
            {/* Top Row: 3-5-4 Split */}
            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 xl:col-span-3 h-[400px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <ColorScaleCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-8 xl:col-span-4 h-[400px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <PipelineCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-12 xl:col-span-5 h-[400px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <InteractiveDocsCard />
            </AnimateIn>

            {/* Bottom Row: 4-4-4 Split */}
            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <VrtCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <TokenGovernanceCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:border-primary/30 group transition-colors overflow-hidden"
            >
              <ThemeSelectorCard />
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}

DesignSystemSection.displayName = "DesignSystemSection";
