/**
 * Pricing comparison matrix for the marketing landing page.
 *
 * Columns map to Sailor's **support plans**, NOT end-user SaaS billing
 * plans. Everything is Apache-2.0, so every plan ships the full source code
 * and may use it commercially at no cost — the differences are support,
 * contractual commitments, and trademark rights, never features or permission.
 *
 * Plan model (matches docs/legal/commercial-support.md):
 *   community  — free, no registration. Apache-2.0 on the repository, every
 *                npm package and every generated project. Closed-source,
 *                hosted and competing use included at any size.
 *   team       — $2,000/year. A support commitment: private channel,
 *                guaranteed 2-business-day first response, priority triage.
 *   enterprise — from $30,000/year. SLA, indemnification, compliance pack,
 *                continuity undertaking, Nebutra / Sailor trademark licence.
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
        values: { community: false, team: false, enterprise: "trademarkLicence" },
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
