/**
 * China VC directory — typed wrapper over the derived dataset
 * (`china-vc-data.json`).
 *
 * Compliance: public institutional info only. Personal / compiled contact
 * details (phone, email) are intentionally excluded; the only outbound contact
 * channel surfaced is each institution's official website. See
 * `docs/plans/2026-06-01-solutions-mega-menu-design.md`.
 */
import { landingPublicSrc } from "@/lib/public-assets";
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
 * Ids of institutions with a curated logo asset on the public CDN.
 * Everything else renders a monogram. Long tail intentionally stays monogram;
 * marquee funds whose sites block automated fetch can be dropped in by id.
 */
export const CHINA_VC_LOGO_IDS: ReadonlySet<number> = new Set<number>([
  2, 3, 4, 6, 7, 11, 12, 13, 15, 17, 19, 20, 24, 27, 29, 33, 38, 39, 41, 42, 44, 45, 46, 49, 50, 51,
  60, 75, 77, 78, 79, 81, 90, 92, 95, 97, 98, 99, 100, 112, 115, 130, 131, 132, 155, 157, 184, 185,
  229, 230, 232, 288, 289, 290, 366, 431, 432,
]);

export function chinaVcLogoFor(org: VcOrg): string | null {
  return CHINA_VC_LOGO_IDS.has(org.id) ? landingPublicSrc(`logos/vc/${org.id}.png`) : null;
}

const CHINA_BY_ID = new Map(CHINA_VC_ORGS.map((o) => [o.id, o]));
export function getChinaVc(id: number): VcOrg | undefined {
  return CHINA_BY_ID.get(id);
}
