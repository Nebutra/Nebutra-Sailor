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
