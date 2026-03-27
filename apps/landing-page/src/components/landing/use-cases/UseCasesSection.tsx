"use client";

import { AnimateIn } from "../AnimateIn";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { USE_CASES_DATA } from "./use-cases-data";

export function UseCasesSection() {
  const t = useTranslations("useCases");
  const [activeTab, setActiveTab] = useState(0);

  const ActiveMockup = USE_CASES_DATA[activeTab].mockup;

  return (
    <section className="py-24 md:py-32 bg-muted/20 relative overflow-hidden">
      <div className="container relative z-10 mx-auto px-4 max-w-[1400px]">
        {/* Header section */}
        <div className="text-center mb-16 md:mb-24">
          <AnimateIn preset="fadeUp">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {t("badge")}
            </p>
          </AnimateIn>
          <AnimateIn preset="fadeUp" delay={100}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-balance leading-tight">
              {t("title")}
            </h2>
          </AnimateIn>
          <AnimateIn preset="fadeUp" delay={200}>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance font-medium">
              {t("description")}
            </p>
          </AnimateIn>
        </div>

        {/* Elite Interactive Split Layout */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-[1400px] mx-auto relative z-20">
          {/* Left Column: Interactive Command-Palette style Tabs */}
          <div className="w-full lg:w-4/12 flex flex-col gap-3 relative order-2 lg:order-1">
            {USE_CASES_DATA.map((uc, i) => {
              const Icon = uc.icon;
              const isActive = activeTab === i;

              return (
                <button
                  key={uc.key}
                  onClick={() => setActiveTab(i)}
                  className={`group relative flex items-start text-left gap-5 p-5 md:p-6 rounded-[2rem] transition-all duration-500 overflow-hidden ${
                    isActive
                      ? "bg-background shadow-xl border border-border/60"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  {/* Subtle active state background glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-primary/5 z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div
                    className={`relative z-10 p-3 rounded-2xl shrink-0 transition-colors duration-500 ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="relative z-10 flex-1 pt-1">
                    <h3
                      className={`text-xl font-bold tracking-tight transition-colors duration-500 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {t(`tabs.${uc.key}` as any)}
                    </h3>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                            {t(`content.${uc.key}.desc` as any)}
                          </p>

                          {/* Optional checkmarks for detail */}
                          <div className="mt-4 flex flex-col gap-2">
                            {[1, 2].map((idx) => {
                              const featText = t(`content.${uc.key}.features.f${idx}` as any);
                              if (!featText || featText.includes("content.")) return null;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs font-semibold text-foreground"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  {featText}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Sticky Mockup Viewport */}
          <div className="w-full lg:w-8/12 relative order-1 lg:order-2">
            <div className="sticky top-32 w-full aspect-square lg:aspect-auto lg:h-[700px] rounded-[3rem] bg-background border border-border/80 shadow-2xl overflow-hidden flex items-center justify-center p-6 lg:p-8 group">
              {/* Internal Glass glare reflection */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_2px_at_center,var(--neutral-5)_1px,transparent_1px)] bg-[length:24px_24px] opacity-30 dark:opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
              <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-50" />
              <div className="absolute -inset-x-32 -top-32 h-[300px] w-[200%] bg-gradient-to-b from-primary/5 to-transparent blur-3xl opacity-50 -rotate-12 transform-gpu" />

              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className="relative z-10 w-full h-full flex items-center justify-center"
                >
                  <ActiveMockup />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
