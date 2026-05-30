"use client";

import { CreditCard } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { CapabilityCard } from "./CapabilityCard";

const BILLING_METRICS = [
  { label: "MRR", value: "$12.4k", delta: "+$1,204", positive: true },
  { label: "Seats", value: "847", delta: "+12", positive: true },
  { label: "Churn", value: "2.3%", delta: "-0.4%", positive: true },
];

/* CSS-only sparkline: 12 data points rendered as a polygon clip-path */
const SPARKLINE_POINTS = [35, 42, 38, 50, 45, 55, 48, 60, 58, 65, 62, 72];

function buildSparklinePath(): string {
  const width = 100;
  const height = 100;
  const maxVal = Math.max(...SPARKLINE_POINTS);
  const minVal = Math.min(...SPARKLINE_POINTS) - 5;
  const range = maxVal - minVal;
  const step = width / (SPARKLINE_POINTS.length - 1);

  const points = SPARKLINE_POINTS.map((val, i) => {
    const x = i * step;
    const y = height - ((val - minVal) / range) * height;
    return `${x}% ${y}%`;
  });

  // Close the polygon at the bottom
  return `${points.join(", ")}, 100% 100%, 0% 100%`;
}

const sparklineClip = buildSparklinePath();

export function BillingCard() {
  const t = useTranslations("microLanding.capability");

  return (
    <CapabilityCard
      title={t("billing.title")}
      description={t("billing.desc")}
      ctaText={t("billing.cta")}
      ctaHref={createPublicDocsUrl("payments/overview")}
      icon={<CreditCard />}
    >
      {/* Mini Billing Dashboard */}
      <div
        style={{ boxShadow: "var(--ring-hairline)" }}
        className="w-full max-w-[400px] mt-auto relative overflow-hidden rounded-t-[var(--radius-card)] border-x border-t border-[var(--neutral-6)] bg-background dark:bg-[var(--neutral-2)] transition-transform duration-150 group-hover:-translate-y-px origin-bottom"
      >
        {/* MRR Sparkline Area */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500">
              Monthly Recurring Revenue
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 dark:border-emerald-400/20">
              +14.2%
            </span>
          </div>
          <p
            className="text-2xl font-semibold text-foreground tabular-nums mb-3"
            style={{ letterSpacing: "var(--tracking-tight)" }}
          >
            $12,400
          </p>
          {/* CSS-only sparkline chart */}
          <div className="relative w-full h-16 rounded-[var(--radius-lg)] overflow-hidden bg-muted/20/[0.02]">
            {/* Gradient fill area */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `polygon(${sparklineClip})`,
                background: "linear-gradient(to bottom, var(--brand-accent) 0%, transparent 100%)",
                opacity: 0.15,
              }}
            />
            {/* Sparkline stroke */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `polygon(${sparklineClip})`,
                background: "transparent",
              }}
            />
            {/* Top edge highlight using a pseudo-border effect */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
            >
              <polyline
                fill="none"
                stroke="var(--brand-accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points={SPARKLINE_POINTS.map((val, i) => {
                  const maxVal = Math.max(...SPARKLINE_POINTS);
                  const minVal = Math.min(...SPARKLINE_POINTS) - 5;
                  const range = maxVal - minVal;
                  const x = (i / (SPARKLINE_POINTS.length - 1)) * 100;
                  const y = 100 - ((val - minVal) / range) * 100;
                  return `${x},${y}`;
                }).join(" ")}
              />
              {/* End dot */}
              <circle
                cx="100"
                cy={(() => {
                  const last = SPARKLINE_POINTS[SPARKLINE_POINTS.length - 1];
                  const maxVal = Math.max(...SPARKLINE_POINTS);
                  const minVal = Math.min(...SPARKLINE_POINTS) - 5;
                  return 100 - ((last - minVal) / (maxVal - minVal)) * 100;
                })()}
                r="3"
                fill="var(--brand-accent)"
                className="drop-shadow-sm"
              />
            </svg>
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2">
              <div className="border-b border-border/20" />
              <div className="border-b border-border/20" />
              <div className="border-b border-border/20" />
            </div>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-3 gap-px bg-border/40 border-t border-border/40">
          {BILLING_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center py-4 px-2 bg-background dark:bg-[var(--neutral-2)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 mb-1">
                {metric.label}
              </p>
              <p
                className="text-lg font-semibold text-foreground tabular-nums mb-1"
                style={{ letterSpacing: "var(--tracking-tight)" }}
              >
                {metric.value}
              </p>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  metric.delta.startsWith("-") && !metric.positive
                    ? "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
                    : "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
                }`}
              >
                {metric.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CapabilityCard>
  );
}
