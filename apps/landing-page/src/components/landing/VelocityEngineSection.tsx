"use client";

import { ChartActivity as Activity, ArrowRight, Stopwatch as Timer } from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

const PHASE_TIMES = [
  { phaseKey: "scaffold", timeValue: 2 },
  { phaseKey: "wire", timeValue: 5 },
  { phaseKey: "ship", timeValue: 3 },
  { phaseKey: "scale", timeValue: null },
] as const;

/**
 * VelocityEngineSection — ML-5.1 + ML-5.2
 *
 * Split layout: left shows the "10 min" speedometer claim with time breakdown,
 * right shows the 4-phase delivery pipeline (reuses workflow step translations).
 */
export function VelocityEngineSection() {
  const t = useTranslations("microLanding.workflow");

  const STEPS = [
    { title: t("step1.title"), description: t("step1.desc") },
    { title: t("step2.title"), description: t("step2.desc") },
    { title: t("step3.title"), description: t("step3.desc") },
    { title: t("step4.title"), description: t("step4.desc") },
  ] as const;

  return (
    <section id="workflow" className="relative w-full bg-background py-24 md:py-32 overflow-hidden">
      {/* Ambient background light */}
      <div className="absolute top-1/2 left-1/4 w-[800px] h-[800px] -translate-y-1/2 -translate-x-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-30 mix-blend-screen" />

      <div className="mx-auto max-w-7xl px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* ML-5.1: Time-to-Market Speedometer */}
          <AnimateIn preset="emerge" inView>
            <div className="flex flex-col relative w-full lg:max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit mb-6 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
                  {t("badge")}
                </p>
              </div>

              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground text-balance mb-12 leading-[1.15]">
                {t("title")}
              </h2>

              {/* Mega Value Display */}
              <div className="relative rounded-[2.5rem] border border-border/40 bg-background/50 backdrop-blur-3xl p-8 md:p-10 shadow-2xl overflow-hidden group hover:border-primary/30 hover:bg-background/80 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-[7rem] md:text-[9rem] font-black leading-none tracking-tighter bg-gradient-to-br from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent drop-shadow-sm">
                      {t("speedometer.number")}
                    </span>
                    <div className="flex flex-col pb-6 md:pb-8 text-left">
                      <span className="text-3xl md:text-4xl font-black text-foreground">
                        {t("speedometer.unit")}
                      </span>
                      <span className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {t("speedometer.subtitle")}
                      </span>
                    </div>
                  </div>
                  <p className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-muted-foreground/90 shadow-inner">
                    <Activity className="w-4 h-4 text-primary/80 animate-pulse" />
                    {t("speedometer.comparison")}
                  </p>
                </div>

                {/* Phase time breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 relative z-10">
                  {PHASE_TIMES.map((item, idx) => (
                    <div
                      key={item.phaseKey}
                      className="flex flex-col items-center rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md px-2 py-4 text-center ring-1 ring-black/5 dark:ring-white/5 hover:ring-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 group/phase"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 transition-colors group-hover/phase:text-foreground">
                        {t(`speedometer.phases.${item.phaseKey}`)}
                      </span>
                      <span
                        className={`text-sm md:text-base font-black tabular-nums tracking-tight ${idx === PHASE_TIMES.length - 1 ? "text-emerald-500 group-hover/phase:text-emerald-400" : "text-primary group-hover/phase:text-primary/80"}`}
                      >
                        {item.timeValue
                          ? `${item.timeValue} ${t("speedometer.unit")}`
                          : t("speedometer.phases.ongoing")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="#workflow"
                className="mt-10 group/link inline-flex items-center gap-3 text-sm font-black tracking-wide text-foreground hover:text-primary transition-colors w-fit"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary transition-all duration-300 group-hover/link:scale-110 group-hover/link:shadow-lg group-hover/link:shadow-primary/20">
                  <Timer className="h-4 w-4" />
                </div>
                <span className="uppercase">{t("speedometer.cta")}</span>
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/link:translate-x-1.5" />
              </Link>
            </div>
          </AnimateIn>

          {/* ML-5.2: 4-Phase Delivery Pipeline */}
          <div className="relative pt-6">
            {/* Connecting Timeline */}
            <div className="absolute left-[34px] top-6 bottom-6 w-[2px] rounded-full bg-gradient-to-b from-primary/60 via-primary/20 to-transparent hidden lg:block" />

            <AnimateInGroup
              inView
              stagger="normal"
              className="flex flex-col gap-5 md:gap-8 relative z-10"
            >
              {STEPS.map((step, index) => (
                <AnimateIn key={step.title} preset="fadeUp" delay={index * 0.1} inView>
                  <article className="group relative flex items-start gap-5 md:gap-8 rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-2xl px-6 py-6 transition-all duration-500 hover:bg-background/80 hover:border-primary/40 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-background/80 border border-border/60 shadow-inner group-hover:border-primary/50 group-hover:shadow-primary/20 transition-all duration-500 z-10 overflow-hidden group-hover:scale-110 group-hover:rotate-3">
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="text-2xl font-black text-foreground/80 group-hover:text-primary transition-colors duration-300">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="flex-1 pt-2">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-[0.95rem] leading-[1.7] text-muted-foreground font-medium">
                        {step.description}
                      </p>
                    </div>
                  </article>
                </AnimateIn>
              ))}
            </AnimateInGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

VelocityEngineSection.displayName = "VelocityEngineSection";
