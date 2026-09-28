import { getAllSolutionSlugs } from "@/lib/constants/solutions-data";

/**
 * Sitemap families whose members come from Nebutra's own data. The template's
 * copy (extra-families.for-template.ts) has none, so the investor data is
 * never imported there.
 */
export const EXTRA_FAMILIES: Readonly<Record<string, () => readonly string[]>> = {
  "/solutions/*": () => getAllSolutionSlugs().map((slug) => `/solutions/${slug}`),
};
