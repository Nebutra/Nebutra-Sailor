"use client";

import { ArrowRight, Layers, LogoGithub, Stopwatch, Users } from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

/**
 * DeploymentStats — ML-6.2
 *
 * Social proof deployment velocity stats below testimonials.
 * Refactored to feature Geist icons, Glassmorphic cards, and full i18n support.
 */
interface DeploymentStatsProps {
  stars?: number;
}

export function DeploymentStats({ stars }: DeploymentStatsProps) {
  const t = useTranslations("stats");

  const STATS = [
    {
      value: stars?.toLocaleString() ?? "1,247",
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
    {
      value: "6 apps",
      label: t("packages"),
      icon: Layers,
      href: "https://docs.nebutra.com/monorepo",
      cta: t("ctaExplore"),
    },
  ] as const;

  return (
    <div className="w-full border-t border-border/40 pt-20 mt-20">
      <AnimateIn preset="emerge" inView className="flex flex-col items-center mb-12">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
          <Layers className="mr-2 h-4 w-4" />
          <span>{t("title")}</span>
        </div>
      </AnimateIn>

      <AnimateInGroup
        inView
        stagger="fast"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 max-w-[1400px] mx-auto"
      >
        {STATS.map((stat, i) => (
          <AnimateIn key={stat.label} preset="fadeUp" delay={i * 0.08} inView>
            <Link
              href={stat.href}
              className="group relative flex flex-col items-start gap-5 p-6 rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl hover:bg-muted/20 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {stat.label}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <div className="text-4xl font-black tracking-tighter text-foreground font-mono tabular-nums">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  <span>{stat.cta}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                </div>
              </div>
            </Link>
          </AnimateIn>
        ))}
      </AnimateInGroup>
    </div>
  );
}

DeploymentStats.displayName = "DeploymentStats";
