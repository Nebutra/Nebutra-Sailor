"use client";

import { CreditCard } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { CapabilityCard } from "./CapabilityCard";

const BILLING_METRICS = [
  { label: "MRR", value: "$12,400", delta: "+$1,204 today" },
  { label: "Active Seats", value: "847", delta: "+12 this week" },
  { label: "Churn", value: "2.3%", delta: "-0.4% vs last mo." },
];

export function BillingCard() {
  const t = useTranslations("microLanding.capability");

  return (
    <CapabilityCard
      title={t("billing.title")}
      description={t("billing.desc")}
      ctaText={t("billing.cta")}
      ctaHref="/docs/billing"
      icon={<CreditCard />}
    >
      {/* Sleek Minimalist Floating Dashboard Widgets */}
      <div className="flex flex-col justify-center gap-4 w-full max-w-[320px] mb-8 relative top-4 group-hover:top-2 transition-all duration-700 mx-auto">
        {BILLING_METRICS.map((metric, i) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between rounded-2xl border border-border/60 dark:border-white/10 bg-background dark:bg-[#0A0A0B] px-6 py-5 shadow-xl transition-all duration-500 hover:shadow-2xl ${i === 1 ? "scale-105 shadow-primary/5 dark:shadow-[0_0_30px_rgba(255,255,255,0.05)] border-primary/20 dark:border-white/20" : ""}`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-zinc-500 mb-1.5">
                {metric.label}
              </p>
              <p className="text-3xl font-black text-foreground dark:text-white tabular-nums tracking-tighter">
                {metric.value}
              </p>
            </div>
            {/* Glowing pill badge for metrics */}
            <span
              className={`text-xs font-bold whitespace-nowrap px-3 py-1.5 rounded-md ${metric.delta.includes("-") ? "text-rose-600 bg-rose-50 border border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]" : "text-emerald-600 bg-emerald-50 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]"}`}
            >
              {metric.delta}
            </span>
          </div>
        ))}
      </div>
    </CapabilityCard>
  );
}
