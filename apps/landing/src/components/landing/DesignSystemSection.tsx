"use client";

import { KineticStepRail } from "@nebutra/ui/patterns";
import { AuroraBackground } from "@nebutra/ui/primitives";
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
      {/* Ambient aurora background */}
      <AuroraBackground variant="subtle" position="center" intensity={0.4} />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="w-full flex flex-col items-center justify-center mb-16 md:mb-20 text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6 opacity-0 translate-y-2 animate-[fade-in_0.5s_ease-out_forwards]">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.2s_forwards]"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            {t("headline")}
          </h2>
          <p className="mt-4 md:mt-6 text-sm md:text-lg text-muted-foreground text-center max-w-xl text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.4s_forwards]">
            {t("subheadline")}
          </p>
        </div>

        {/* Bento Grid */}
        <KineticStepRail className="w-full max-w-[1280px] mx-auto p-3 sm:p-4 md:p-5">
          <AnimateInGroup
            stagger="normal"
            className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 w-full"
          >
            {/* Top Row: 3-5-4 Split */}
            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 xl:col-span-3 h-[400px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <ColorScaleCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-8 xl:col-span-4 h-[400px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <PipelineCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-12 xl:col-span-5 h-[400px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <InteractiveDocsCard />
            </AnimateIn>

            {/* Bottom Row: 4-4-4 Split */}
            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <VrtCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <TokenGovernanceCard />
            </AnimateIn>

            <AnimateIn
              preset="fadeUp"
              className="md:col-span-12 lg:col-span-4 h-[320px] rounded-[var(--radius-panel)] border border-border bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl hover:border-border hover:bg-muted hover:-translate-y-px group transition-transform duration-150 overflow-hidden"
            >
              <ThemeSelectorCard />
            </AnimateIn>
          </AnimateInGroup>
        </KineticStepRail>
      </div>
    </section>
  );
}

DesignSystemSection.displayName = "DesignSystemSection";
