"use client";

import { Cpu, GitBranch, Lightning as Rocket, SettingsSliders as Sliders } from "@nebutra/icons";
import { KineticStep, KineticStepRail } from "@nebutra/ui/patterns";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function WorkflowSection() {
  const t = useTranslations("microLanding.workflow");

  const STEPS = [
    {
      title: t("step1.title"),
      description: t("step1.desc"),
      icon: GitBranch,
    },
    {
      title: t("step2.title"),
      description: t("step2.desc"),
      icon: Sliders,
    },
    {
      title: t("step3.title"),
      description: t("step3.desc"),
      icon: Cpu,
    },
    {
      title: t("step4.title"),
      description: t("step4.desc"),
      icon: Rocket,
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
        <KineticStepRail className="mx-auto min-h-[400px] w-full">
          <AnimateInGroup
            inView
            stagger="normal"
            className="grid w-full grid-cols-1 gap-6 md:grid-cols-4"
          >
            {STEPS.map((step, index) => {
              return (
                <AnimateIn key={step.title} preset="fadeUp" className="h-full">
                  <KineticStep
                    icon={step.icon}
                    index={index + 1}
                    phaseLabel={`Phase 0${index + 1}`}
                    title={step.title}
                    description={step.description}
                  />
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </KineticStepRail>
      </div>
    </section>
  );
}

WorkflowSection.displayName = "WorkflowSection";
