/**
 * Pricing comparison matrix for the marketing landing page.
 *
 * Columns map to Sailor's **commercial tiers**, NOT end-user SaaS billing
 * plans. Every tier ships the full source code, and every tier may use it
 * commercially at no cost — the differences are support, contractual
 * commitments, and trademark rights, never features or permission.
 *
 * Tier model (matches LICENSE-COMMERCIAL.md):
 *   community  — free, no registration. MIT on npm, FSL-1.1-ALv2 on the repo
 *                (converts to Apache-2.0 after two years). Closed-source
 *                commercial use included at any team size or revenue.
 *   team       — $2,000/year. A support commitment: private channel,
 *                guaranteed 2-business-day first response, priority triage.
 *   enterprise — from $30,000/year. SLA, indemnification, compliance pack,
 *                continuity undertaking, trademark / white-label rights.
 *
 * The billing system's FREE/PRO/ENTERPRISE plans are a configurable demo
 * for products built with Sailor and are intentionally not shown here.
 *
 * Each row's `label` is rendered via i18n key
 *   landing.comparison.feature.{groupId}.{rowId}
 * Each plan column header via
 *   landing.comparison.plan.{planId}
 */
export type PlanId = "community" | "team" | "enterprise";

export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  readonly id: string;
  readonly values: Readonly<Record<PlanId, ComparisonCell>>;
}

export interface ComparisonGroup {
  readonly id: string;
  readonly rows: readonly ComparisonRow[];
}

export const PLAN_IDS: readonly PlanId[] = ["community", "team", "enterprise"] as const;

export const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    id: "license",
    rows: [
      {
        id: "type",
        values: {
          community: "MIT + FSL-1.1-ALv2",
          team: "MIT + FSL-1.1-ALv2",
          enterprise: "MIT + FSL-1.1-ALv2",
        },
      },
      {
        id: "commercial-use",
        values: { community: true, team: true, enterprise: true },
      },
      {
        id: "registration",
        values: { community: "Not required", team: "Not required", enterprise: "Not required" },
      },
      {
        id: "trademark",
        values: { community: false, team: false, enterprise: "White-label rights" },
      },
    ],
  },
  {
    id: "source",
    rows: [
      { id: "full-source", values: { community: true, team: true, enterprise: true } },
      { id: "all-packages", values: { community: true, team: true, enterprise: true } },
      {
        id: "update-window",
        values: {
          community: "Unlimited",
          team: "Unlimited + advance breaking-change notice",
          enterprise: "Unlimited + long-term support branch",
        },
      },
    ],
  },
  {
    id: "support",
    rows: [
      {
        id: "channel",
        values: {
          community: "Public issues & Discord",
          team: "Private channel",
          enterprise: "Named contact",
        },
      },
      {
        id: "first-response",
        values: { community: false, team: "2 business days", enterprise: "4 business hours" },
      },
      {
        id: "security-patch",
        values: { community: "Best-effort", team: "Best-effort", enterprise: "Contractual" },
      },
    ],
  },
  {
    id: "procurement",
    rows: [
      { id: "indemnification", values: { community: false, team: false, enterprise: true } },
      { id: "dpa", values: { community: false, team: false, enterprise: true } },
      { id: "continuity", values: { community: false, team: false, enterprise: true } },
    ],
  },
] as const;
