import type { PackageFeatureEntry } from "../package-feature-data";

/**
 * Returns the list of nodes used to build a specimen's geometry.
 *
 * Many entries (e.g. leaf packages without sub-children) come through with
 * `children: []`. The specimens still need *something* to draw — so we fall
 * back to a derived role list, the same shape the legacy `ArtifactVisual`
 * used. The fallback is intentionally short so each variant can lay it out
 * symmetrically.
 */
export function getSpecimenNodes(entry: PackageFeatureEntry, max = 6): string[] {
  if (entry.children.length > 0) {
    return entry.children.slice(0, max);
  }

  return [entry.label, entry.group, "interface", "runtime", "proof"].slice(0, max);
}

/**
 * Tiny pseudo-hash for an entry — used to generate consistent fake
 * numerals/codes per page so two visits look identical.
 */
export function entrySignature(entry: PackageFeatureEntry): string {
  let hash = 0;
  for (let i = 0; i < entry.slug.length; i += 1) {
    hash = (hash * 31 + entry.slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(6, "0").slice(0, 6).toUpperCase();
}

/** Pad a number with leading zeros — for ledger row numbers, port ids, etc. */
export function pad(value: number, width = 2): string {
  return value.toString().padStart(width, "0");
}
