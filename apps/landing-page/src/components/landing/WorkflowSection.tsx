"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function WorkflowSection() {
  const t = useTranslations("microLanding.workflow");
  const STEPS = [
    {
      title: t("step1.title"),
      description: t("step1.desc"),
    },
    {
      title: t("step2.title"),
      description: t("step2.desc"),
    },
    {
      title: t("step3.title"),
      description: t("step3.desc"),
    },
    {
      title: t("step4.title"),
      description: t("step4.desc"),
    },
  ] as const;

  return (
    <section id="workflow" className="w-full bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">
            {t("badge")}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl text-balance">
            {t("title")}
          </h2>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((step, index) => (
            <AnimateIn key={step.title} preset="fadeUp" className="h-full">
              <article className="group flex h-full flex-col rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl p-8 transition-all hover:bg-muted/40 hover:border-primary/20 shadow-xl shadow-primary/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-foreground">{step.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </article>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

WorkflowSection.displayName = "WorkflowSection";
