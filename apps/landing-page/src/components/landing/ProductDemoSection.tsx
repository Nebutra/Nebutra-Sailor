"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnalyticsTerminal } from "./product-demo/AnalyticsTerminal";
import { BillingTerminal } from "./product-demo/BillingTerminal";
import { FauxTerminal } from "./product-demo/FauxTerminal";
import { PRODUCT_DEMO_TABS, type ProductDemoTabId } from "./product-demo/product-demo-data";
import { WorkspacesTerminal } from "./product-demo/WorkspacesTerminal";

export function ProductDemoSection() {
  const t = useTranslations("microLanding.productDemo");
  const [activeId, setActiveId] = useState<ProductDemoTabId>(PRODUCT_DEMO_TABS[0].id);

  const renderActiveTerminal = () => {
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
  };

  return (
    <section id="product" className="relative w-full overflow-hidden bg-background py-24 md:py-32">
      {/* Decorative Background Blur */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 max-w-[1400px] relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-20 md:mb-28">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-balance text-foreground mb-6 max-w-4xl">
            {t("title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl leading-relaxed font-medium">
            {t("description")}
          </p>
        </div>

        {/* Interactive Split Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center max-w-[1400px] mx-auto">
          {/* Left: Structural Stepper Navigation */}
          <div className="lg:col-span-5 flex flex-col relative w-full pt-4">
            {/* Continuous Vertical Tracking Line */}
            <div className="absolute left-[27px] top-6 bottom-12 w-px bg-border/60 dark:bg-white/10 hidden md:block" />

            {PRODUCT_DEMO_TABS.map((tab, index) => {
              const isActive = activeId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  className={`group relative flex items-start text-left py-6 transition-all duration-500 outline-none w-full ${isActive ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                >
                  {/* Step Node */}
                  <div className="relative shrink-0 w-14 h-14 hidden md:flex items-center justify-center mr-6 z-10 transition-transform duration-300">
                    {/* The active pill animation */}
                    {isActive && (
                      <motion.div
                        layoutId="activeDemoTab"
                        className="absolute inset-0 rounded-full bg-foreground shadow-elevation-high dark:shadow-[0_0_30px_rgba(255,255,255,0.2)] border-2 border-background dark:border-[#0A0A0B]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    {/* The static inactive background */}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-full bg-muted ring-1 ring-border/50 group-hover:bg-muted/80 transition-colors" />
                    )}

                    <span
                      className={`relative z-20 font-mono text-sm font-bold transition-colors delay-75 ${
                        isActive ? "text-background" : "text-muted-foreground"
                      }`}
                    >
                      0{index + 1}
                    </span>
                  </div>

                  {/* Content Fragment */}
                  <div className="flex-1 pt-1">
                    <h3
                      className={`text-xl md:text-2xl font-bold mb-3 tracking-tight transition-colors duration-400 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {t(tab.labelKey as any)}
                    </h3>
                    <p
                      className={`text-sm md:text-base leading-relaxed font-medium transition-colors duration-400 ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                    >
                      {t(tab.descKey as any)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Premium Faux-Terminal Render */}
          <div className="lg:col-span-7 w-full h-[450px] md:h-[500px]">
            <FauxTerminal>{renderActiveTerminal()}</FauxTerminal>
          </div>
        </div>
      </div>
    </section>
  );
}

ProductDemoSection.displayName = "ProductDemoSection";
