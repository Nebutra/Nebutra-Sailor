"use client";

import { ArrowRight, LogoGithub, Stopwatch, Users } from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function VelocitySignalStrip() {
  const t = useTranslations("stats");

  const STATS = [
    {
      value: "1,247",
      label: t("github"),
      icon: LogoGithub,
      href: "https://github.com/Nebutra/Nebutra-Sailor",
      cta: t("ctaStar"),
    },
    {
      value: "380+",
      label: t("discord"),
      icon: Users,
      href: "https://discord.gg/nebutra",
      cta: t("ctaJoin"),
    },
    {
      value: "< 10 min",
      label: t("setup"),
      icon: Stopwatch,
      href: "/#workflow",
      cta: t("ctaStart"),
    },
  ] as const;

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto mt-12 px-4">
      <AnimateInGroup
        inView
        stagger="fast"
        className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6"
      >
        {STATS.map((stat, i) => (
          <AnimateIn
            key={stat.label}
            preset="fadeUp"
            delay={i * 0.08}
            inView
            className="w-full sm:w-auto"
          >
            <Link
              href={stat.href}
              className="group relative flex items-center gap-4 px-6 py-4 rounded-[var(--radius-2xl)] border border-border/40 bg-background/40 backdrop-blur-xl hover:bg-muted/20 hover:border-border/80 transition-all duration-300 w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-[var(--radius-2xl)] transition-opacity duration-300 pointer-events-none" />

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/20 transition-colors">
                <stat.icon className="h-5 w-5" />
              </div>

              <div className="flex flex-col items-start text-left">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-2xl font-semibold text-foreground tabular-nums"
                    style={{ letterSpacing: "var(--tracking-tight)" }}
                  >
                    {stat.value}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                    {stat.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                </div>
              </div>
            </Link>
          </AnimateIn>
        ))}
      </AnimateInGroup>

      {/* Divider */}
      <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

VelocitySignalStrip.displayName = "VelocitySignalStrip";
