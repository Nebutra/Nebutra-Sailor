"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import {
  ScaffoldVisual,
  ScaleVisual,
  ShipVisual,
  VelocityCard,
  WireVisual,
} from "./velocity-cards";

/**
 * VelocityEngineSection — Redesigned High-Fidelity 2x2 Symmetric Workflow Grid
 *
 * Each card represents one of the 4 steps to production.
 * Organized top-left to bottom-right sequence.
 */
export function VelocityEngineSection() {
  const t = useTranslations("microLanding.workflow");

  return (
    <section className="relative w-full py-24 md:py-32 xl:py-40 overflow-hidden bg-muted/20">
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 md:px-6">
        {/* Two-tone headline */}
        <AnimateIn preset="fadeUp" inView className="mx-auto max-w-4xl text-center mb-16 md:mb-24">
          <p className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary uppercase tracking-widest mb-6">
            10 min
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-[4rem] font-black tracking-tight leading-[1.15] text-balance">
            <span className="text-foreground">{t("title")}</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto text-balance">
            {t("presetHint.message")}
          </p>
        </AnimateIn>

        {/* Powerful Symmetrical 2x2 Grid */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 max-w-5xl mx-auto"
        >
          {/* Step 1: Scaffold */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step1.title")} description={t("step1.desc")} time="2 min">
              <ScaffoldVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Step 2: Wire */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step2.title")} description={t("step2.desc")} time="5 min">
              <WireVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Step 3: Ship */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step3.title")} description={t("step3.desc")} time="3 min">
              <ShipVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Step 4: Scale */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step4.title")} description={t("step4.desc")} time="∞">
              <ScaleVisual />
            </VelocityCard>
          </AnimateIn>
        </AnimateInGroup>

        {/* Closing statement */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mt-20 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-6 py-3 backdrop-blur-sm shadow-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-foreground tracking-wide">
                预设系统准备就绪
              </span>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

VelocityEngineSection.displayName = "VelocityEngineSection";
