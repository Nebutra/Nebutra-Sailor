"use client";

import { AuroraBackground } from "@nebutra/ui/primitives";
import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnimateIn } from "../AnimateIn";
import { USE_CASES_DATA } from "./use-cases-data";

const USE_CASE_FEATURE_SLOTS = [
  { id: "primary", index: 1 },
  { id: "secondary", index: 2 },
] as const;

export function UseCasesSection() {
  const t = useTranslations("useCases");
  type UseCasesTranslationKey = Parameters<typeof t>[0];
  const [activeTab, setActiveTab] = useState(0);

  const ActiveMockup = USE_CASES_DATA[activeTab].mockup;

  return (
    <section className="py-16 md:py-24 lg:py-32 bg-muted/20 relative overflow-hidden">
      {/* Ambient aurora background */}
      <AuroraBackground variant="subtle" position="center" intensity={0.4} />
      <div className="container relative z-10 mx-auto px-4 max-w-[1400px]">
        {/* Header section */}
        <div className="text-center mb-10 md:mb-16 lg:mb-24">
          <AnimateIn preset="fadeUp">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {t("badge")}
            </p>
          </AnimateIn>
          <AnimateIn preset="fadeUp" delay={100}>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-balance"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
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
        <LazyMotion features={domAnimation}>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-[1400px] mx-auto relative z-20">
            {/* Left Column: Interactive Command-Palette style Tabs */}
            <div className="w-full lg:w-4/12 flex flex-col gap-3 relative order-1 lg:order-1">
              {USE_CASES_DATA.map((uc, i) => {
                const Icon = uc.icon;
                const isActive = activeTab === i;

                return (
                  <button
                    type="button"
                    key={uc.key}
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(i)}
                    className={`group relative flex items-start text-left gap-5 p-5 md:p-6 rounded-[var(--radius-card)] transition-transform duration-150 overflow-hidden hover:-translate-y-px ${
                      isActive
                        ? "bg-background border border-[var(--neutral-6)]"
                        : "hover:bg-[var(--neutral-3)] border border-transparent"
                    }`}
                    style={isActive ? { boxShadow: "var(--ring-hairline)" } : undefined}
                  >
                    {/* Subtle active state background glow */}
                    {isActive && (
                      <m.div
                        layoutId="activeGlow"
                        className="absolute inset-0 bg-primary/5 z-0"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div
                      className={`relative z-10 p-3 rounded-[var(--radius-button)] shrink-0 transition-colors duration-500 ${isActive ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"}`}
                    >
                      <Icon className="size-6" />
                    </div>

                    <div className="relative z-10 flex-1 pt-1">
                      <h3
                        className={`text-xl font-semibold transition-colors duration-500 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {t(`tabs.${uc.key}` as UseCasesTranslationKey)}
                      </h3>

                      <AnimatePresence initial={false}>
                        {isActive && (
                          <m.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                              {t(`content.${uc.key}.desc` as UseCasesTranslationKey)}
                            </p>

                            {/* Optional checkmarks for detail */}
                            <div className="mt-4 flex flex-col gap-2">
                              {USE_CASE_FEATURE_SLOTS.map((slot) => {
                                const featText = t(
                                  `content.${uc.key}.features.f${slot.index}` as UseCasesTranslationKey,
                                );
                                if (!featText || featText.includes("content.")) return null;
                                return (
                                  <div
                                    key={`${uc.key}-${slot.id}`}
                                    className="flex items-center gap-2 text-xs font-semibold text-foreground"
                                  >
                                    <div className="size-1.5 rounded-full bg-primary" />
                                    {featText}
                                  </div>
                                );
                              })}
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Sticky Mockup Viewport */}
            <div className="hidden w-full lg:w-8/12 relative lg:order-2 lg:block">
              <div
                className="sticky top-32 w-full aspect-[4/5] sm:aspect-square lg:aspect-auto lg:h-[700px] rounded-[var(--radius-panel)] bg-background border border-[var(--neutral-6)] overflow-hidden flex items-center justify-center p-3 sm:p-6 lg:p-8 group"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                {/* Internal Glass glare reflection */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_2px_at_center,var(--neutral-5)_1px,transparent_1px)] bg-[length:24px_24px] opacity-30 dark:opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-50" />

                <AnimatePresence mode="popLayout" initial={false}>
                  <m.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="relative z-10 w-full h-full flex items-center justify-center"
                  >
                    {/* Mockups are desktop-only fixtures; mobile keeps the
                      decision cards and skips unreadable scaled demos. */}
                    <div className="w-full h-full flex items-center justify-center">
                      <ActiveMockup />
                    </div>
                  </m.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}
