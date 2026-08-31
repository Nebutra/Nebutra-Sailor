"use client";

import { AuroraBackground } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { AIGatewayCard, BillingCard, MultiTenantCard, RBACCard } from "./capability-cards";

export function CapabilityMatrixSection() {
  const t = useTranslations("microLanding.capability");

  return (
    <section
      id="capabilities"
      className="relative w-full scroll-mt-24 overflow-hidden bg-background py-24 md:py-32"
    >
      {/* Ambient aurora background */}
      <AuroraBackground variant="subtle" position="center" intensity={0.4} />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-24">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-balance"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
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
