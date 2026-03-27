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
 * VelocityEngineSection — Supabase-inspired asymmetric bento
 *
 * Row 1: Scaffold (wide, spans 3 cols → 2 cols on md) + Wire (1 col)
 * Row 2: Ship (1 col) + Scale (1 col) + empty or future card
 *
 * Each card is a self-contained high-cohesion visual component.
 */
export function VelocityEngineSection() {
  const t = useTranslations("microLanding.workflow");

  return (
    <section className="relative w-full py-24 md:py-32 overflow-hidden bg-muted/30">
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 md:px-6">
        {/* Two-tone headline */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15]">
            <span className="text-foreground">
              {t("speedometer.number")} {t("speedometer.unit")}.
            </span>{" "}
            <span className="text-muted-foreground">{t("title")}</span>
          </h2>
        </AnimateIn>

        {/* Asymmetric bento — 3 columns on lg, 2 on md, 1 on mobile */}
        <AnimateInGroup
          inView
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Scaffold — spans 2 cols on lg */}
          <AnimateIn preset="fadeUp" className="lg:col-span-2">
            <VelocityCard title={t("step1.title")} description={t("step1.desc")} time="2 min">
              <ScaffoldVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Wire — 1 col */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step2.title")} description={t("step2.desc")} time="5 min">
              <WireVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Ship — 1 col */}
          <AnimateIn preset="fadeUp">
            <VelocityCard title={t("step3.title")} description={t("step3.desc")} time="3 min">
              <ShipVisual />
            </VelocityCard>
          </AnimateIn>

          {/* Scale — spans 2 cols on lg */}
          <AnimateIn preset="fadeUp" className="lg:col-span-2">
            <VelocityCard title={t("step4.title")} description={t("step4.desc")} time="∞">
              <ScaleVisual />
            </VelocityCard>
          </AnimateIn>
        </AnimateInGroup>

        {/* Closing statement */}
        <AnimateIn preset="fadeUp" inView>
          <p className="mt-12 text-center text-lg md:text-xl font-medium">
            <span className="text-foreground font-semibold">{t("presetHint.badge")}.</span>{" "}
            <span className="text-muted-foreground">{t("presetHint.message")}</span>
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}

VelocityEngineSection.displayName = "VelocityEngineSection";
