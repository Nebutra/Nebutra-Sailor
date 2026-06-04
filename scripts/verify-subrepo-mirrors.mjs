#!/usr/bin/env node
import { resolveSubrepoMirrors } from "./lib/subrepo-mirrors.mjs";

function formatList(values) {
  return values.length === 0 ? "none" : values.join(", ");
}

const cohortArg = process.argv.find((arg) => arg.startsWith("--cohort="));
const cohort = cohortArg ? cohortArg.slice("--cohort=".length) : undefined;

try {
  const { config, mirrors } = resolveSubrepoMirrors({ cohort });
  const byCategory = new Map();

  for (const mirror of mirrors) {
    const list = byCategory.get(mirror.category) ?? [];
    list.push(`${mirror.packageName}->${config.owner}/${mirror.repoName}`);
    byCategory.set(mirror.category, list);
  }

  console.log(
    `[subrepo-mirrors] ${mirrors.length} mirror(s) validated for ${config.sourceRepository}`,
  );
  for (const [category, entries] of [...byCategory.entries()].sort()) {
    console.log(`[subrepo-mirrors] ${category}: ${formatList(entries.sort())}`);
  }
} catch (error) {
  console.error(`[subrepo-mirrors] ${error.message}`);
  process.exit(1);
}
