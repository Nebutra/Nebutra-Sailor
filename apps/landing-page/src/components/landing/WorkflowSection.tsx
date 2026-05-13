"use client";

import { Cpu, GitBranch, Lightning as Rocket, SettingsSliders as Sliders } from "@nebutra/icons";
import { AnimatedBeam } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function WorkflowSection() {
  const t = useTranslations("microLanding.workflow");
  const containerRef = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);

  const STEPS = [
    {
      title: t("step1.title"),
      description: t("step1.desc"),
      icon: GitBranch,
      ref: ref1,
    },
    {
      title: t("step2.title"),
      description: t("step2.desc"),
      icon: Sliders,
      ref: ref2,
    },
    {
      title: t("step3.title"),
      description: t("step3.desc"),
      icon: Cpu,
      ref: ref3,
    },
    {
      title: t("step4.title"),
      description: t("step4.desc"),
      icon: Rocket,
      ref: ref4,
    },
  ] as const;

  return (
    <section id="workflow" className="w-full bg-background py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-24">
          <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">
            {t("badge")}
          </p>
          <h2
            className="text-3xl font-semibold text-foreground md:text-4xl lg:text-5xl text-balance"
            style={{ letterSpacing: "var(--tracking-heading)" }}
          >
            {t("title")}
          </h2>
        </AnimateIn>

        {/* Timeline Container */}
        <div
          ref={containerRef}
          className="relative flex flex-col md:flex-row items-center md:items-start justify-between w-full min-h-[400px] mx-auto p-8 md:p-12 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background/50 backdrop-blur-xl"
          style={{ boxShadow: "var(--ring-hairline)" }}
        >
          {/* Animated Beams connecting nodes */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={ref1}
            toRef={ref2}
            pathColor="hsl(var(--muted-foreground) / 0.15)"
            gradientStartColor="var(--brand-primary)"
            gradientStopColor="var(--brand-accent)"
            duration={3}
            delay={0}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={ref2}
            toRef={ref3}
            pathColor="hsl(var(--muted-foreground) / 0.15)"
            gradientStartColor="var(--brand-accent)"
            gradientStopColor="var(--brand-tertiary)"
            duration={3}
            delay={1}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={ref3}
            toRef={ref4}
            pathColor="hsl(var(--muted-foreground) / 0.15)"
            gradientStartColor="var(--brand-tertiary)"
            gradientStopColor="var(--brand-primary)"
            duration={3}
            delay={2}
          />

          <AnimateInGroup
            inView
            stagger="normal"
            className="flex flex-col md:flex-row items-center md:items-start justify-between w-full h-full gap-16 md:gap-8 relative z-10"
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <AnimateIn
                  key={step.title}
                  preset="fadeUp"
                  className="flex flex-col items-center flex-1 max-w-[240px]"
                >
                  {/* The Node that the beam connects to */}
                  <div
                    ref={step.ref}
                    className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] bg-background border border-[var(--neutral-6)] mb-8 relative z-20 group hover:-translate-y-px transition-transform duration-150"
                    style={{ boxShadow: "var(--ring-hairline)" }}
                  >
                    <Icon className="h-7 w-7 text-primary relative z-10 group-hover:text-foreground transition-colors" />
                    {/* Glowing pulse behind the icon */}
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full z-[0]"></div>
                  </div>

                  {/* Step Content */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-6 px-3 rounded-full bg-primary/10 text-[10px] font-bold tracking-widest text-primary uppercase mb-4">
                      Phase 0{index + 1}
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-foreground">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground text-balance">
                      {step.description}
                    </p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}

WorkflowSection.displayName = "WorkflowSection";
