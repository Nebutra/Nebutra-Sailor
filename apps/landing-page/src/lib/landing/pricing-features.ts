/**
 * Pricing comparison matrix for the marketing landing page.
 *
 * Each row's `label` is rendered via i18n key
 *   landing.comparison.feature.{groupId}.{rowId}
 * Each plan column header via
 *   landing.comparison.plan.{planId}
 *
 * Cell values:
 *   - boolean `true`  → ✓ (included)
 *   - boolean `false` → — (not included)
 *   - string         → rendered verbatim (e.g. "10 GB")
 */
export type PlanId = "free" | "pro" | "enterprise";

export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  readonly id: string;
  readonly values: Readonly<Record<PlanId, ComparisonCell>>;
}

export interface ComparisonGroup {
  readonly id: string;
  readonly rows: readonly ComparisonRow[];
}

export const PLAN_IDS: readonly PlanId[] = ["free", "pro", "enterprise"] as const;

export const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    id: "auth",
    rows: [
      {
        id: "providers",
        values: { free: "1 provider", pro: "All providers", enterprise: "All + SSO" },
      },
      { id: "rbac", values: { free: false, pro: true, enterprise: true } },
      { id: "audit", values: { free: false, pro: false, enterprise: true } },
    ],
  },
  {
    id: "tenancy",
    rows: [
      {
        id: "workspaces",
        values: { free: "1", pro: "Unlimited", enterprise: "Unlimited + isolation" },
      },
      { id: "rls", values: { free: false, pro: true, enterprise: true } },
      { id: "byo-db", values: { free: false, pro: false, enterprise: true } },
    ],
  },
  {
    id: "ai",
    rows: [
      {
        id: "providers",
        values: { free: "OpenAI only", pro: "All providers", enterprise: "BYO models" },
      },
      {
        id: "gateway",
        values: { free: false, pro: true, enterprise: true },
      },
      { id: "metering", values: { free: false, pro: true, enterprise: true } },
    ],
  },
  {
    id: "storage",
    rows: [
      { id: "uploads", values: { free: "1 GB", pro: "100 GB", enterprise: "Unlimited" } },
      {
        id: "s3-compatible",
        values: { free: false, pro: true, enterprise: true },
      },
      {
        id: "resumable",
        values: { free: false, pro: true, enterprise: true },
      },
    ],
  },
  {
    id: "email",
    rows: [
      { id: "transactional", values: { free: "100/mo", pro: "100K/mo", enterprise: "Unlimited" } },
      { id: "templates", values: { free: true, pro: true, enterprise: true } },
      { id: "domains", values: { free: "1", pro: "10", enterprise: "Unlimited" } },
    ],
  },
  {
    id: "support",
    rows: [
      {
        id: "channel",
        values: { free: "Community", pro: "Priority email", enterprise: "Dedicated Slack" },
      },
      { id: "sla", values: { free: false, pro: false, enterprise: "99.99%" } },
      { id: "onboarding", values: { free: false, pro: false, enterprise: true } },
    ],
  },
] as const;
