"use client";

import { AuroraBackground, Heading } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { AIGatewayCard, BillingCard, MultiTenantCard, RBACCard } from "./capability-cards";

export function CapabilityMatrixSection() {
  const t = useTranslations("microLanding.capability");

  return (
    <section
      id="capabilities"
      className="relative w-full scroll-mt-24 overflow-hidden bg-background py-24"
    >
      {/* Ambient aurora background */}
      <AuroraBackground variant="subtle" position="center" intensity={0.4} />

      <div className="relative z-10 px-8 xl:px-16">
        {/* Section header, as the site's Intro sets one: left on the page grid, the label in
            sentence case above it, no badge pill. */}
        <AnimateIn preset="emerge" inView className="mb-16 md:mb-20">
          <p className="mb-4 text-sm text-muted-foreground">{t("badge")}</p>
          <Heading level={2} display className="max-w-3xl">
            {t("title")}
          </Heading>
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
