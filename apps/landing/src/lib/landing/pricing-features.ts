/**
 * Pricing comparison matrix for the marketing landing page.
 *
 * Columns map to Sailor's **template license tiers**, NOT end-user SaaS
 * billing plans. Every license tier ships the full source code — the
 * differences are rights, seats, and support, not features.
 *
 * Tier model (matches LICENSE-COMMERCIAL.md):
 *   independent — ≤ 1 FTE & < $1M ARR, free, CLI-emitted Independent Developer
 *                 License (no copyleft when scaffolded via create-sailor)
 *   startup     — 2–50 FTE, $799/year, closed-source commercial license
 *   enterprise  — 50+ FTE or ≥ $1M ARR or white-label / SLA, custom
 *
 * The billing system's FREE/PRO/ENTERPRISE plans are a configurable demo
 * for products built with Sailor and are intentionally not shown here.
 *
 * Each row's `label` is rendered via i18n key
 *   landing.comparison.feature.{groupId}.{rowId}
 * Each plan column header via
 *   landing.comparison.plan.{planId}
 */
export type PlanId = "independent" | "startup" | "enterprise";

export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  readonly id: string;
  readonly values: Readonly<Record<PlanId, ComparisonCell>>;
}

export interface ComparisonGroup {
  readonly id: string;
  readonly rows: readonly ComparisonRow[];
}

export const PLAN_IDS: readonly PlanId[] = ["independent", "startup", "enterprise"] as const;

export const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    id: "license",
    rows: [
      {
        id: "type",
        values: {
          independent: "Independent (no copyleft)",
          startup: "Commercial",
          enterprise: "Commercial",
        },
      },
      {
        id: "projects",
        values: {
          independent: "1 product, ≤ 1 FTE",
          startup: "Unlimited team",
          enterprise: "Multi-product / multi-division",
        },
      },
    ],
  },
  {
    id: "source",
    rows: [
      { id: "full-source", values: { independent: true, startup: true, enterprise: true } },
      { id: "all-packages", values: { independent: true, startup: true, enterprise: true } },
      {
        id: "update-window",
        values: {
          independent: "Annual renewal (free)",
          startup: "12 months",
          enterprise: "12 months + roadmap input",
        },
      },
    ],
  },
  {
    id: "support",
    rows: [
      {
        id: "channel",
        values: { independent: "Community", startup: "Email", enterprise: "Priority SLA" },
      },
    ],
  },
] as const;
