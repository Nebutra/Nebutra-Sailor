/**
 * Load promoted FIU catalog (optional). Missing file → empty merge (seed-only).
 */

import fiuCatalog from "./generated/fiu-catalog.json";
import type { Specimen, Typeface, Work } from "./schema";

type FiuCatalog = {
  typefaces?: Typeface[];
  works?: Work[];
  specimens?: Specimen[];
  stats?: Record<string, unknown>;
};

const data = fiuCatalog as FiuCatalog;

export const FIU_TYPEFACES: readonly Typeface[] = data.typefaces ?? [];
export const FIU_WORKS: readonly Work[] = data.works ?? [];
export const FIU_SPECIMENS: readonly Specimen[] = data.specimens ?? [];
