/**
 * Pricing comparison matrix for the marketing landing page.
 *
 * Columns map to Sailor's **template license tiers**, NOT end-user SaaS
 * billing plans. Every license tier ships the full source code — the
 * differences are rights, seats, and support, not features.
 *
 * The billing system's FREE/PRO/ENTERPRISE plans are a configurable demo
 * for products built with Sailor and are intentionally not shown here.
 *
 * Each row's `label` is rendered via i18n key
 *   landing.comparison.feature.{groupId}.{rowId}
 * Each plan column header via
 *   landing.comparison.plan.{planId}
 */
export type PlanId = "individual" | "startup" | "agency";

export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  readonly id: string;
  readonly values: Readonly<Record<PlanId, ComparisonCell>>;
}

export interface ComparisonGroup {
  readonly id: string;
  readonly rows: readonly ComparisonRow[];
}

export const PLAN_IDS: readonly PlanId[] = ["individual", "startup", "agency"] as const;

export const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    id: "license",
    rows: [
      {
        id: "type",
        values: { individual: "AGPL-3.0", startup: "Commercial", agency: "Commercial" },
      },
      {
        id: "projects",
        values: {
          individual: "Unlimited personal",
          startup: "Unlimited team",
          agency: "Unlimited client",
        },
      },
    ],
  },
  {
    id: "source",
    rows: [
      { id: "full-source", values: { individual: true, startup: true, agency: true } },
      { id: "all-packages", values: { individual: true, startup: true, agency: true } },
      {
        id: "update-window",
        values: { individual: "Perpetual", startup: "12 months", agency: "12 months" },
      },
    ],
  },
  {
    id: "support",
    rows: [
      {
        id: "channel",
        values: { individual: "Community", startup: "Email", agency: "Email" },
      },
    ],
  },
] as const;
