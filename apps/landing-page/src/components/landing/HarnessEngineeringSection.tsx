"use client";

import { GitBranch, LockClosed, ShieldCheck } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

const STATS = [
  { valueKey: "stat1Value", labelKey: "stat1Label" },
  { valueKey: "stat2Value", labelKey: "stat2Label" },
  { valueKey: "stat3Value", labelKey: "stat3Label" },
] as const;

const PIPELINE_STEPS = ["lint", "build", "test", "scan", "deploy"] as const;

const RATCHET_BARS = [
  { label: "oklch", current: 142, floor: 120, pass: true },
  { label: "hex", current: 28, ceiling: 40, pass: true },
] as const;

const CODE_LINES = [
  { text: 'test("no hardcoded hex in components", () => {', type: "code" as const },
  { text: "  fc.assert(", type: "key" as const },
  { text: "    fc.property(componentFiles, (file) =>", type: "code" as const },
  { text: "      !file.match(/#[0-9a-f]{3,8}/i)", type: "key" as const },
  { text: "    )", type: "code" as const },
  { text: "  );", type: "code" as const },
  { text: "});", type: "code" as const },
];

const CARDS = [
  {
    titleKey: "card1Title",
    descKey: "card1Desc",
    Icon: ShieldCheck,
  },
  {
    titleKey: "card2Title",
    descKey: "card2Desc",
    Icon: LockClosed,
  },
  {
    titleKey: "card3Title",
    descKey: "card3Desc",
    Icon: GitBranch,
  },
] as const;

export function HarnessEngineeringSection() {
  const t = useTranslations("microLanding.harness");

  return (
    <section id="harness" className="w-full bg-background py-24 md:py-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-20">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance mb-6">
            {t("headline")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("subheadline")}
          </p>
        </AnimateIn>

        {/* Stats row */}
        <AnimateIn preset="fadeUp" inView className="mb-16 md:mb-20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 md:gap-24">
            {STATS.map((stat) => (
              <div key={stat.valueKey} className="text-center">
                <span className="block text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent">
                  {t(stat.valueKey)}
                </span>
                <span className="block mt-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {t(stat.labelKey)}
                </span>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* 3-column feature grid */}
        <AnimateInGroup inView stagger="normal" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CARDS.map((card) => (
            <AnimateIn key={card.titleKey} preset="fadeUp">
              <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <card.Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    {t(card.titleKey)}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-base text-muted-foreground leading-relaxed mb-8">
                  {t(card.descKey)}
                </p>

                {/* Card-specific visual */}
                <div className="mt-auto">
                  {card.titleKey === "card1Title" && <ArchTestVisual />}
                  {card.titleKey === "card2Title" && <RatchetVisual />}
                  {card.titleKey === "card3Title" && <PipelineVisual />}
                </div>
              </article>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

/** Mini code snippet for Architecture Tests card */
function ArchTestVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50 dark:bg-zinc-900/40">
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80" />
        <span className="ml-2 text-[10px] font-mono text-muted-foreground/60">arch.test.ts</span>
      </div>
      <div className="p-5 bg-gradient-to-br from-background/40 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]">
        <pre className="font-mono text-[12px] sm:text-[13px] leading-relaxed">
          {CODE_LINES.map((line, i) => (
            <span
              key={i}
              className={`block ${
                line.type === "key"
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : line.text.includes("test") || line.text.includes("fc.")
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-foreground/80 dark:text-zinc-300"
              }`}
            >
              {line.text}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

/** Ratchet progress bars for Governance card */
function RatchetVisual() {
  return (
    <div className="space-y-4">
      {RATCHET_BARS.map((bar) => {
        const max = "ceiling" in bar ? bar.ceiling : bar.floor * 2;
        const percentage = Math.min((bar.current / max) * 100, 100);
        const threshold = "floor" in bar ? bar.floor : bar.ceiling;

        return (
          <div
            key={bar.label}
            className="rounded-xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 px-5 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                {bar.label}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {bar.current}/{threshold} {"floor" in bar ? "\u2265" : "\u2264"}{" "}
                {bar.pass ? "\u2713" : "\u2717"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-border/30 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mini pipeline diagram for CI card */
function PipelineVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md p-5">
      <div className="flex items-center justify-between gap-1">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 mb-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">
                  {"\u2713"}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                {step}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="h-[2px] w-full min-w-2 bg-gradient-to-r from-emerald-500/40 to-emerald-500/20 -mt-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

HarnessEngineeringSection.displayName = "HarnessEngineeringSection";
