"use client";

import { Check, CrossSmall, Minus } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { AnimateIn } from "./AnimateIn";

type CellStatus = "yes" | "no" | "partial" | "text";

interface ComparisonRow {
  featureKey: string;
  sailor: CellStatus;
  sailorTextKey?: string;
  nextForge: CellStatus;
  nextForgeTextKey?: string;
  supastarter: CellStatus;
  supastarterTextKey?: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    featureKey: "multiTenant",
    sailor: "text",
    sailorTextKey: "orgRbacIsolation",
    nextForge: "text",
    nextForgeTextKey: "manualSetup",
    supastarter: "text",
    supastarterTextKey: "orgRolesSeat",
  },
  {
    featureKey: "aiGateway",
    sailor: "text",
    sailorTextKey: "multiProviderGateway",
    nextForge: "text",
    nextForgeTextKey: "aiPackage",
    supastarter: "text",
    supastarterTextKey: "vercelAiSdk",
  },
  {
    featureKey: "auth",
    sailor: "text",
    sailorTextKey: "clerkCustomIdp",
    nextForge: "text",
    nextForgeTextKey: "clerkOnly",
    supastarter: "text",
    supastarterTextKey: "betterAuth",
  },
  {
    featureKey: "billing",
    sailor: "text",
    sailorTextKey: "stripeUsage",
    nextForge: "text",
    nextForgeTextKey: "stripeOnly",
    supastarter: "text",
    supastarterTextKey: "fiveProviders",
  },
  {
    featureKey: "i18n",
    sailor: "text",
    sailorTextKey: "sevenLangs",
    nextForge: "text",
    nextForgeTextKey: "i18nPackage",
    supastarter: "text",
    supastarterTextKey: "twoLangs",
  },
  {
    featureKey: "frameworks",
    sailor: "text",
    sailorTextKey: "nextjsOnly",
    nextForge: "text",
    nextForgeTextKey: "nextjsOnly",
    supastarter: "text",
    supastarterTextKey: "nextNuxtTanstack",
  },
  {
    featureKey: "monorepo",
    sailor: "text",
    sailorTextKey: "turboNineApps",
    nextForge: "text",
    nextForgeTextKey: "turboSevenApps",
    supastarter: "text",
    supastarterTextKey: "turboFiveApps",
  },
  {
    featureKey: "api",
    sailor: "text",
    sailorTextKey: "honoOpenapi",
    nextForge: "text",
    nextForgeTextKey: "nextjsRoutes",
    supastarter: "text",
    supastarterTextKey: "honoOrpc",
  },
  {
    featureKey: "e2eTests",
    sailor: "text",
    sailorTextKey: "playwrightSharded",
    nextForge: "no",
    supastarter: "text",
    supastarterTextKey: "playwrightGha",
  },
  {
    featureKey: "archTests",
    sailor: "text",
    sailorTextKey: "sevenPropertyBased",
    nextForge: "no",
    supastarter: "no",
  },
  {
    featureKey: "designSystem",
    sailor: "text",
    sailorTextKey: "fourLayerTokens",
    nextForge: "text",
    nextForgeTextKey: "shadcn",
    supastarter: "text",
    supastarterTextKey: "radixShadcn",
  },
  {
    featureKey: "bgJobs",
    sailor: "text",
    sailorTextKey: "inngest",
    nextForge: "text",
    nextForgeTextKey: "cronOnly",
    supastarter: "text",
    supastarterTextKey: "triggerQstash",
  },
  {
    featureKey: "license",
    sailor: "text",
    sailorTextKey: "agpl",
    nextForge: "text",
    nextForgeTextKey: "mit",
    supastarter: "text",
    supastarterTextKey: "paidFrom349",
  },
];

function CellValue({ status, label }: { status: CellStatus; label?: string }) {
  switch (status) {
    case "yes":
      return <Check className="mx-auto h-4 w-4 stroke-[3] text-[color:var(--status-success)]" />;
    case "no":
      return (
        <CrossSmall className="mx-auto h-4 w-4 stroke-[3] text-[color:var(--status-danger)]" />
      );
    case "partial":
      return <Minus className="mx-auto h-4 w-4 stroke-[3] text-[color:var(--status-warning)]" />;
    case "text":
      return (
        <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
          {label}
        </span>
      );
  }
}

/**
 * AlternativeComparison — ML-9.2
 *
 * Comparison table: Sailor vs. next-forge vs. Supastarter.
 * Renders beside the FAQ accordion to address "why not just build it" objections.
 */
export function AlternativeComparison() {
  const t = useTranslations("comparison");

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl p-8 transition-all hover:bg-muted/40 hover:border-primary/20 shadow-xl shadow-primary/5">
      <AnimateIn preset="emerge" inView>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--brand-gradient)" }}
          />
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{t("badge")}</p>
        </div>
        <p className="text-2xl font-bold text-foreground mb-6">{t("title")}</p>
      </AnimateIn>

      <div className="flex-1 overflow-x-auto rounded-2xl border border-border/60 bg-muted/40 dark:bg-[var(--neutral-1)]/80 backdrop-blur-sm shadow-inner">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-4 px-4 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.feature")}
              </th>
              <th className="relative py-4 px-6 text-center text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                <span
                  className="absolute inset-x-2 top-0 h-[2px] rounded-full"
                  style={{ background: "var(--brand-gradient)" }}
                />
                {t("columns.sailor")}
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.nextForge")}
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                {t("columns.supastarter")}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => {
              const featureText = t(`features.${row.featureKey}` as never);

              const sailorLabel = row.sailorTextKey
                ? t(`values.${row.sailorTextKey}` as never)
                : undefined;
              const nextForgeLabel = row.nextForgeTextKey
                ? t(`values.${row.nextForgeTextKey}` as never)
                : undefined;
              const supastarterLabel = row.supastarterTextKey
                ? t(`values.${row.supastarterTextKey}` as never)
                : undefined;

              return (
                <tr
                  key={row.featureKey}
                  className={`transition-colors hover:bg-primary/5 ${
                    i < COMPARISON_ROWS.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <td className="py-3 px-4 text-xs font-medium text-foreground/80 whitespace-nowrap">
                    {featureText}
                  </td>
                  <td className="py-3 px-6 text-center bg-primary/[0.03]">
                    <CellValue status={row.sailor} label={sailorLabel} />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <CellValue status={row.nextForge} label={nextForgeLabel} />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <CellValue status={row.supastarter} label={supastarterLabel} />
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
