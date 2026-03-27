"use client";

import { CloudUpload, Lightning, SettingsGear, Terminal } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AnimateIn } from "./AnimateIn";

interface PipelineNode {
  labelKey: string;
  time: string;
  icon: ReactNode;
  accent?: boolean;
}

const PIPELINE: PipelineNode[] = [
  { labelKey: "scaffold", time: "2 min", icon: <Terminal className="h-4 w-4" /> },
  { labelKey: "wire", time: "5 min", icon: <SettingsGear className="h-4 w-4" /> },
  { labelKey: "ship", time: "3 min", icon: <CloudUpload className="h-4 w-4" /> },
  { labelKey: "scale", time: "∞", icon: <Lightning className="h-4 w-4" />, accent: true },
];

/**
 * VelocityEngineSection — Neon-inspired pipeline visualization
 *
 * Two-tone headline → horizontal pipeline diagram → minimal feature strip
 */
export function VelocityEngineSection() {
  const t = useTranslations("microLanding.workflow");

  return (
    <section className="relative w-full py-32 md:py-40 overflow-hidden bg-muted/30">
      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6">
        {/* Two-tone headline */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-4xl text-center mb-24">
          <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15]">
            <span className="text-foreground">
              {t("speedometer.number")} {t("speedometer.unit")}.
            </span>{" "}
            <span className="text-muted-foreground">{t("title")}</span>
          </h2>
        </AnimateIn>

        {/* Pipeline visualization */}
        <AnimateIn preset="fadeUp" inView className="mb-24">
          <div className="relative mx-auto max-w-4xl">
            {/* Horizontal connector line */}
            <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-0">
              {PIPELINE.map((node, i) => (
                <div key={node.labelKey} className="flex flex-col items-center relative group">
                  {/* Node dot */}
                  <div
                    className={[
                      "relative z-10 flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-300",
                      node.accent
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-400/60 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                        : "border-border bg-background text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb,0,51,254),0.1)]",
                    ].join(" ")}
                  >
                    {node.icon}
                  </div>

                  {/* Label — monospace */}
                  <span className="mt-5 font-mono text-sm font-semibold text-foreground tracking-tight">
                    {t(`step${i + 1}.title`)}
                  </span>

                  {/* Description */}
                  <p className="mt-2 text-center text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                    {t(`step${i + 1}.desc`)}
                  </p>

                  {/* Time pill */}
                  <span
                    className={[
                      "mt-4 inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-bold tabular-nums",
                      node.accent
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground border border-border",
                    ].join(" ")}
                  >
                    {node.time}
                  </span>

                  {/* Vertical connector for mobile */}
                  {i < PIPELINE.length - 1 && <div className="md:hidden w-px h-8 bg-border mt-4" />}
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* Minimal feature strip */}
        <AnimateIn preset="fadeUp" inView>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{t("presetHint.badge")}</span>
              {" — "}
              {t("presetHint.message")}
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

VelocityEngineSection.displayName = "VelocityEngineSection";
