"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { AIGatewayCard, BillingCard, MultiTenantCard, RBACCard } from "./capability-cards";

export function CapabilityMatrixSection() {
  const t = useTranslations("microLanding.capability");

  return (
    <section
      id="capabilities"
      className="w-full bg-background py-24 md:py-32 relative overflow-hidden"
    >
      {/* Subtle Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-24">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance">
            {t("title")}
          </h2>
        </AnimateIn>

        {/* 2x2 Capability Bento */}
        <AnimateInGroup inView stagger="normal" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimateIn preset="fadeUp" className="h-full">
            <MultiTenantCard />
          </AnimateIn>
          <AnimateIn preset="fadeUp" className="h-full">
            <AIGatewayCard />
          </AnimateIn>
          <AnimateIn preset="fadeUp" className="h-full">
            <RBACCard />
          </AnimateIn>
          <AnimateIn preset="fadeUp" className="h-full">
            <BillingCard />
          </AnimateIn>
        </AnimateInGroup>
      </div>
    </section>
  );
}

CapabilityMatrixSection.displayName = "CapabilityMatrixSection";
