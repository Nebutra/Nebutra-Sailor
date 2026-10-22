import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as AllIcons from "@nebutra/icons";
import { LANGUAGE_REGISTRY } from "@nebutra/theme/languages";
import { CATALOG } from "@nebutra/ui/catalog";
import { coveredNames, GROUPS } from "@/lib/components/registry";
import { componentExports, UI_SRC } from "@/lib/components/ui-source";
import switchability from "@/lib/generated/switchability.json";
import { PATTERNS } from "@/lib/pattern-data";
import { aliases, failures, scales, semanticRoles, tokenSet } from "@/lib/tokens";

/**
 * Everything the home page and llms.txt count, measured at build time from the
 * same sources the rest of the site reads. Nothing is typed in, which is the one
 * property that makes a number worth showing: a figure a person maintains by
 * hand is wrong within a week, and this site's argument is that it cannot drift.
 */
export function measure() {
  const light = tokenSet("light");
  const colours = [
    ...semanticRoles("light"),
    ...scales("light").flatMap((scale) => scale.steps),
    ...aliases("light"),
  ];

  const claimed = coveredNames();
  let exports = 0;
  let covered = 0;
  for (const group of GROUPS) {
    const list = componentExports(group.barrel);
    exports += list.length;
    covered += list.filter((entry) => claimed.has(entry.name)).length;
  }

  const dimensions = switchability.dimensions as ReadonlyArray<{
    id: string;
    consumers: number;
    status: string;
  }>;
  const live = dimensions.filter((dimension) => dimension.status === "live");

  return {
    tokens: light.tokens.length,
    contrastFailures: failures(colours).length,
    exports,
    covered,
    live: live.length,
    dimensions: dimensions.length,
    readers: live.reduce((sum, dimension) => sum + dimension.consumers, 0),
    // Counted the way /icons counts them, so the two pages cannot disagree.
    icons: Object.keys(AllIcons).filter((name) => name !== "IconProps").length,
    // The registry, not the switcher: that module is a client module, and a server
    // component gets a reference to its exports rather than the values.
    languages: LANGUAGE_REGISTRY.languages.length,
    patterns: PATTERNS.length,
    catalog: CATALOG.length,
    catalogStable: CATALOG.filter((entry) => entry.status === "stable").length,
    demos: CATALOG.reduce((sum, entry) => sum + entry.demos.length, 0),
  };
}

export type SiteStats = ReturnType<typeof measure>;

/** The monorepo root, found the way the component scan finds the UI source. */
const REPO_ROOT = join(UI_SRC, "..", "..", "..", "..");

/**
 * The name and version a workspace package declares, read from its package.json
 * at build time — so the install page shows the version that is in the repo and
 * never one somebody typed.
 */
export function workspacePackage(dir: string): { name: string; version: string } {
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, dir, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  return { name: raw.name, version: raw.version };
}
