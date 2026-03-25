"use client";

import { Check, Target } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { AnimateIn } from "./AnimateIn";

interface ComparisonRow {
  featureKey: string;
  sailor?: boolean;
  sailorKey?: string;
  diy?: boolean;
  diyKey?: string;
  other?: boolean;
  otherKey?: string;
}

const COMPARISON_KEYS: ComparisonRow[] = [
  { featureKey: "isolation", sailor: true, diyKey: "months2", otherKey: "partial" },
  { featureKey: "aiGateway", sailor: true, diyKey: "month1", other: false },
  { featureKey: "authRbac", sailor: true, diyKey: "month1", other: true },
  { featureKey: "billing", sailor: true, diyKey: "month1", otherKey: "partial" },
  { featureKey: "monorepo", sailor: true, diyKey: "weeks2", other: false },
  { featureKey: "setup", sailorKey: "min10", diyKey: "months4", otherKey: "days" },
  { featureKey: "license", sailorKey: "free", diyKey: "time", otherKey: "paid" },
];

function CellValue({
  value,
  isAlert,
  isSuccess,
}: {
  value: string | boolean;
  isAlert?: boolean;
  isSuccess?: boolean;
}) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />;
  }
  if (value === false) {
    return <span className="text-muted-foreground/30">—</span>;
  }
  return (
    <span
      className={`text-xs font-semibold whitespace-nowrap ${
        isAlert
          ? "text-orange-600 dark:text-orange-400/90"
          : isSuccess
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground"
      }`}
    >
      {value}
    </span>
  );
}

/**
 * AlternativeComparison — ML-9.2
 *
 * Comparison table: Sailor vs. DIY vs. Other Kits.
 * Renders beside the FAQ accordion to address "why not just build it" objections.
 */
export function AlternativeComparison() {
  const t = useTranslations("comparison");

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl p-8 transition-all hover:bg-muted/40 hover:border-primary/20 shadow-xl shadow-primary/5">
      <AnimateIn preset="emerge" inView>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{t("badge")}</p>
        </div>
        <p className="text-2xl font-bold text-foreground mb-6">{t("title")}</p>
      </AnimateIn>

      <div className="flex-1 overflow-x-auto rounded-2xl border border-border/60 bg-muted/40 dark:bg-[#0a0a0a]/80 backdrop-blur-sm shadow-inner">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-4 px-4 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.feature")}
              </th>
              <th className="py-4 px-6 text-center text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                {t("columns.sailor")}
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.diy")}
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.other")}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_KEYS.map((row, i) => {
              const featureText = t(`features.${row.featureKey}` as any);

              const sailorValue =
                row.sailor !== undefined ? row.sailor : t(`values.${row.sailorKey}` as any);
              const diyValue = row.diyKey ? t(`values.${row.diyKey}` as any) : row.diy;
              const otherValue =
                row.other !== undefined ? row.other : t(`values.${row.otherKey}` as any);

              return (
                <tr
                  key={row.featureKey}
                  className={`transition-colors hover:bg-primary/5 ${
                    i < COMPARISON_KEYS.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <td className="py-3 px-4 text-xs font-medium text-foreground/80 whitespace-nowrap">
                    {featureText}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <CellValue value={sailorValue as any} isSuccess={row.sailorKey !== undefined} />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <CellValue value={diyValue as any} isAlert={!!row.diyKey} />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <CellValue
                      value={otherValue as any}
                      isAlert={row.otherKey === "paid" || row.otherKey === "days"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

AlternativeComparison.displayName = "AlternativeComparison";
