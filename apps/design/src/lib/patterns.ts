import { GROUPS } from "@/lib/components/registry";
import { componentExports } from "@/lib/components/ui-source";

/**
 * Names a pattern page claims, checked against what the library exports.
 *
 * A pattern is the one thing on this site that cannot be derived: which surface
 * to reach for is a decision somebody made, and no amount of reading source
 * recovers it. But the *components* a pattern names can be checked, and that is
 * where the old docs went wrong — the modality page in design-docs still
 * documents `Flash`, `IconButton` and `TextInput`, which were removed with
 * @primer/react and have not existed for a long time. Prose about a component
 * that is gone is worse than no prose: it sends people looking for an import
 * that will not resolve.
 *
 * So a pattern page states its cast, and the cast is verified at build time.
 * The editorial half stays hand-written because it has to be; the factual half
 * cannot rot.
 */

let exported: Set<string> | null = null;

function allExports(): Set<string> {
  if (exported) return exported;
  exported = new Set<string>();
  for (const group of GROUPS) {
    for (const entry of componentExports(group.barrel)) exported.add(entry.name);
  }
  return exported;
}

export interface CastCheck {
  name: string;
  exists: boolean;
}

/** Check a pattern's named components against the barrels. */
export function verifyCast(names: readonly string[]): CastCheck[] {
  const known = allExports();
  return names.map((name) => ({ name, exists: known.has(name) }));
}
