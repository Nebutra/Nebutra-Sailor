/**
 * China VC directory — typed wrapper over the derived dataset
 * (`china-vc-data.json`).
 *
 * Compliance: public institutional info only. Personal / compiled contact
 * details (phone, email) are intentionally excluded; the only outbound contact
 * channel surfaced is each institution's official website. See
 * `docs/plans/2026-06-01-solutions-mega-menu-design.md`.
 */
import data from "./china-vc-data.json";
import type { VcOrg } from "./vc";

export type { VcOrg } from "./vc";
export { vcMonogram } from "./vc";

export const CHINA_VC_ORGS = data.orgs as VcOrg[];
/** Sectors, ordered by how many institutions invest in them. */
export const CHINA_VC_SECTORS = data.sectors as string[];
/** Institution types, ordered by frequency. */
export const CHINA_VC_TYPES = data.types as string[];
export const CHINA_VC_COUNT = CHINA_VC_ORGS.length;
/** Cumulative deal count across all institutions — a year-agnostic activity signal. */
export const CHINA_VC_TOTAL_DEALS = CHINA_VC_ORGS.reduce((sum, o) => sum + (o.total ?? 0), 0);

/**
 * Ids of institutions with a curated local logo asset at `/logos/vc/<id>.png`.
 * Everything else renders a monogram. Long tail intentionally stays monogram;
 * marquee funds whose sites block automated fetch can be dropped in by id.
 */
export const CHINA_VC_LOGO_IDS: ReadonlySet<number> = new Set<number>([
  6, 7, 11, 13, 19, 24, 45, 49, 77, 78, 97, 112, 155, 229,
]);

export function chinaVcLogoFor(org: VcOrg): string | null {
  return CHINA_VC_LOGO_IDS.has(org.id) ? `/logos/vc/${org.id}.png` : null;
}
