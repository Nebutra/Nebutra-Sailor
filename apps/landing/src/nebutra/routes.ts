import { brand } from "@nebutra/brand/metadata";
import { type SectionId, sectionOf } from "@/site-map";

/**
 * Where each section of the Nebutra site lives: its site-map path.
 */
export const SECTION_PATH = Object.fromEntries(
  (["home", "journal", "sailor", "sleptons", "building", "company"] as const).map((id) => [
    id,
    sectionOf(id).path,
  ]),
) as Record<SectionId, string>;

export const ROUTES = {
  ...SECTION_PATH,
  studio: `${SECTION_PATH.sailor}/studio`,
} as const;

/**
 * The site a Sailor project starts as — the template, deployed on its own
 * (infra/fly/acme.toml). It follows Sailor Studio: it wears the look the
 * visitor last chose there (components/preset-preview.tsx).
 */
export const ACME_SITE = `https://acme.${brand.domains.landing}`;
