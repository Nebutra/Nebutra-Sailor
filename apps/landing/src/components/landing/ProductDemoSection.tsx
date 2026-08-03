"use client";

import { KineticConsoleFrame } from "@nebutra/ui/patterns";
import { AuroraBackground } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { domAnimation, LazyMotion, m, useReducedMotion } from "@/shared/motion";
import { AnalyticsTerminal } from "./product-demo/AnalyticsTerminal";
import { BillingTerminal } from "./product-demo/BillingTerminal";
import { PRODUCT_DEMO_TABS, type ProductDemoTabId } from "./product-demo/product-demo-data";
import { WorkspacesTerminal } from "./product-demo/WorkspacesTerminal";

function ProductDemoTerminal({ activeId }: { activeId: ProductDemoTabId }) {
  switch (activeId) {
    case "analytics":
      return <AnalyticsTerminal />;
    case "billing":
      return <BillingTerminal />;
    case "workspaces":
      return <WorkspacesTerminal />;
    default:
      return null;
  }
}

export function ProductDemoSection() {
  const t = useTranslations("microLanding.productDemo");
  type ProductDemoTranslationKey = Parameters<typeof t>[0];
  const [activeId, setActiveId] = useState<ProductDemoTabId>(PRODUCT_DEMO_TABS[0].id);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="product"
      className="relative w-full overflow-hidden bg-background py-16 md:py-24 lg:py-32"
    >
      {/* Ambient aurora background */}
      <AuroraBackground variant="monochrome" position="center" intensity={0.4} />

      <div className="container mx-auto px-4 max-w-[1400px] relative z-10">
        {/* Header */}
        <div className="mb-12 flex w-full flex-col items-center text-center md:mb-20 lg:mb-28">
          <div className="mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="text-sm font-semibold tracking-wide text-primary uppercase">
              {t("badge")}
            </span>
          </div>
          <h2
            className="mb-6 w-full max-w-4xl text-balance text-3xl font-semibold text-foreground md:text-4xl lg:text-5xl"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            {t("title")}
          </h2>
          <p className="w-full max-w-2xl text-balance text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
            {t("description")}
          </p>
        </div>

        {/* Interactive Split Interface */}
        <LazyMotion features={domAnimation}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center max-w-[1400px] mx-auto">
            {/* Left: Structural Stepper Navigation */}
            <div className="lg:col-span-5 flex flex-col relative w-full pt-4">
              {/* Continuous Vertical Tracking Line */}
              <div className="absolute left-[27px] top-6 bottom-12 w-px bg-border/60 hidden md:block" />

              {PRODUCT_DEMO_TABS.map((tab, index) => {
                const isActive = activeId === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    aria-pressed={isActive}
                    onClick={() => setActiveId(tab.id)}
                    className={`group relative flex items-start text-left py-6 transition-opacity duration-500 motion-reduce:duration-0 outline-none w-full ${isActive ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                  >
                    {/* Step Node */}
                    <div className="relative z-10 mr-6 hidden size-14 shrink-0 items-center justify-center transition-transform duration-300 motion-reduce:transition-none md:flex">
                      {/* The active pill animation */}
                      {isActive && (
                        <m.div
                          layoutId={shouldReduceMotion ? undefined : "activeDemoTab"}
                          className="absolute inset-0 rounded-full bg-foreground border-2 border-background dark:border-[#0A0A0B]"
                          style={{ boxShadow: "var(--ring-hairline)" }}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 300, damping: 30 }
                          }
                        />
                      )}
                      {/* The static inactive background */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-full bg-muted ring-1 ring-border/50 group-hover:bg-muted/80 transition-colors motion-reduce:transition-none" />
                      )}

                      <span
                        className={`relative z-20 font-mono text-sm font-bold transition-colors delay-75 motion-reduce:delay-0 motion-reduce:transition-none ${
                          isActive ? "text-background" : "text-muted-foreground"
                        }`}
                      >
                        0{index + 1}
                      </span>
                    </div>

                    {/* Content Fragment */}
                    <div className="flex-1 pt-1">
                      <h3
                        className={`text-xl md:text-2xl font-semibold mb-3 transition-colors duration-400 motion-reduce:duration-0 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {t(tab.labelKey as ProductDemoTranslationKey)}
                      </h3>
                      <p
                        className={`text-sm md:text-base leading-relaxed font-medium transition-colors duration-400 motion-reduce:duration-0 ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                      >
                        {t(tab.descKey as ProductDemoTranslationKey)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Premium Faux-Terminal Render */}
            <div className="hidden lg:col-span-7 lg:block w-full h-[500px] relative">
              <KineticConsoleFrame status={activeId}>
                <ProductDemoTerminal activeId={activeId} />
              </KineticConsoleFrame>
            </div>
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}

ProductDemoSection.displayName = "ProductDemoSection";
