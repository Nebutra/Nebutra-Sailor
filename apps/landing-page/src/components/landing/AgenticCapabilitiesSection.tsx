"use client";

import { Cpu, Layers, Shield } from "@nebutra/icons";
import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type * as React from "react";
import type { ComponentType } from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

interface Capability {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  titleKey: string;
  descKey: string;
  accent: string;
  /** A short "system status" label to inject terminal-style metadata into each card */
  statusLine: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Shield,
    titleKey: "items.harness.title",
    descKey: "items.harness.desc",
    accent: "var(--brand-primary)",
    statusLine: "coverage: 100% | ratchet: active | drift: 0",
  },
  {
    icon: Cpu,
    titleKey: "items.agentic.title",
    descKey: "items.agentic.desc",
    accent: "var(--brand-accent)",
    statusLine: "agents: claude • cursor • codex | mode: autonomous",
  },
  {
    icon: Zap,
    titleKey: "items.vibe.title",
    descKey: "items.vibe.desc",
    accent: "var(--status-success)",
    statusLine: "providers: openai • anthropic • local | latency: <80ms",
  },
  {
    icon: Layers,
    titleKey: "items.design.title",
    descKey: "items.design.desc",
    accent: "var(--brand-tertiary)",
    statusLine: "layers: brand → tokens → theme → ui | themes: 6",
  },
];

export function AgenticCapabilitiesSection() {
  const t = useTranslations("agenticCapabilities");

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background border-y border-border/40">
      {/* High-tech dot grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#80808018_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-primary/8 blur-[120px] rounded-[100%] pointer-events-none -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--brand-accent)]/5 blur-[120px] rounded-full pointer-events-none translate-x-1/4 translate-y-1/4" />

      <div className="container relative z-10 mx-auto px-4 max-w-6xl">
        {/* Section header */}
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

        {/* High-Density Bento Box: 2×2 matrix */}
        <AnimateInGroup
          inView
          stagger="fast"
          className="rounded-[2rem] border border-border/50 bg-border/50 gap-px grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 relative max-w-5xl mx-auto"
        >
          {/* Subtle inner gradient overlay */}
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-[var(--brand-accent)]/5 pointer-events-none" />

          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <AnimateIn
                key={item.titleKey}
                preset="fadeUp"
                className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden min-h-[300px]"
              >
                {/* Hover corner spotlight */}
                <div
                  className="absolute -top-20 -right-20 w-52 h-52 rounded-full blur-[60px] opacity-0 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none z-0"
                  style={{ backgroundColor: item.accent }}
                />

                {/* Icon */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                  <Icon className="h-6 w-6" style={{ color: item.accent }} />
                </div>

                {/* Title */}
                <h3 className="relative z-10 text-[20px] md:text-[22px] font-bold tracking-tight text-foreground mb-3 leading-snug">
                  {t(item.titleKey as any)}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-[15px] text-muted-foreground font-medium leading-[1.7] mb-8 flex-1">
                  {t(item.descKey as any)}
                </p>

                {/* System status line — terminal-style metadata */}
                <div className="relative z-10 w-full mt-auto">
                  <div className="w-full rounded-lg border border-white/10 dark:border-white/5 bg-zinc-950/90 px-3 py-2 group-hover:border-white/15 transition-colors">
                    <code className="block font-mono text-[10px] sm:text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed truncate">
                      <span className="text-zinc-600 mr-1.5 select-none">›</span>
                      {item.statusLine}
                    </code>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      </div>
    </section>
  );
}

AgenticCapabilitiesSection.displayName = "AgenticCapabilitiesSection";
