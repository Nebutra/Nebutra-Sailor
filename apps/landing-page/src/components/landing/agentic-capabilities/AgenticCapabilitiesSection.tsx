"use client";

import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "../AnimateIn";
import { CapabilityCard } from "./CapabilityCard";
import { CAPABILITIES } from "./data";

export function AgenticCapabilitiesSection() {
  const t = useTranslations("agenticCapabilities");

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background border-y border-border/40">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#80808018_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-primary/8 blur-[120px] rounded-[100%] pointer-events-none -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--brand-accent)]/5 blur-[120px] rounded-full pointer-events-none translate-x-1/4 translate-y-1/4" />

      <div className="container relative z-10 mx-auto px-4 max-w-6xl">
        {/* Header */}
        <AnimateIn preset="fadeUp" inView className="text-center mb-16 md:mb-24 mx-auto max-w-3xl">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-muted/40 backdrop-blur-md px-3 py-1 mb-8 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-[0.15em] text-foreground uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter text-foreground text-balance mb-6 leading-[1.05]">
            {t("title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
            {t("description")}
          </p>
        </AnimateIn>

        {/* Bento 2×2 */}
        <AnimateInGroup
          inView
          stagger="fast"
          className="rounded-[2rem] border border-border/50 bg-border/50 gap-px grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 relative max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-[var(--brand-accent)]/5 pointer-events-none" />

          {CAPABILITIES.map((item) => (
            <AnimateIn key={item.titleKey} preset="fadeUp">
              <CapabilityCard
                card={item}
                title={t(item.titleKey as any)}
                description={t(item.descKey as any)}
              />
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

AgenticCapabilitiesSection.displayName = "AgenticCapabilitiesSection";
