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

/**
 * A cell is either a boolean (rendered as check / dash) or an i18n token
 * resolved against `landing.comparison.value.*`. Cells are NEVER raw display
 * text — otherwise the table renders translated row labels beside English
 * values, which is how it shipped before 2026-07-26.
 */
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
          community: "licenseIds",
          team: "licenseIds",
          enterprise: "licenseIds",
        },
      },
      {
        id: "commercial-use",
        values: { community: true, team: true, enterprise: true },
      },
      {
        id: "registration",
        values: { community: "notRequired", team: "notRequired", enterprise: "notRequired" },
      },
      {
        id: "trademark",
        values: { community: false, team: false, enterprise: "whiteLabelRights" },
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
          community: "unlimited",
          team: "unlimitedPlusNotice",
          enterprise: "unlimitedPlusLts",
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
          community: "publicChannels",
          team: "privateChannel",
          enterprise: "namedContact",
        },
      },
      {
        id: "first-response",
        values: { community: false, team: "twoBusinessDays", enterprise: "fourBusinessHours" },
      },
      {
        id: "security-patch",
        values: { community: "bestEffort", team: "bestEffort", enterprise: "contractual" },
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
