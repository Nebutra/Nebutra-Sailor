#!/usr/bin/env node

// CI guard: a server change refreshes data in place, it does not reload the page.
//
// `location.reload()` throws away scroll position, focus, unsaved input and
// every client cache, and repaints the whole app. In apps/web (a Vite SPA that
// still compiles legacy Next code through a next-compat shim) the shim's
// `router.refresh()` used to be exactly that. The replacement is
// `useRevalidate()` (apps/web/src/lib/navigation/use-revalidate.ts): it re-runs
// the router's loaders and refreshes the TanStack Query cache by scope.
//
// Two checks:
//   1. `location.reload(` anywhere under apps/** — allowed only at the call
//      sites listed in governance.config.json → noHardReload.reloadAllowlist,
//      each with the reason a full load is genuinely required (an identity or
//      workspace change that must rebuild boot-time persistence scope, chunk
//      load recovery, a boot-failure retry).
//   2. `router.refresh(` in apps/web outside the allowlist — new code calls
//      `useRevalidate()`, which refreshes the query cache too.
//
// Shrink-only: an allowlisted file whose count drops below its entry fails as
// stale, so the list can only get shorter.
//
// Run: node scripts/lint-no-hard-reload.mjs

import fs from "node:fs";
import path from "node:path";
import { findFiles, grepExcludes } from "./lib/scan.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOT = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "governance.config.json"), "utf8"));
const { reloadAllowlist, refreshAllowlist } = config.noHardReload;

const TEST_FILE = /(\.test\.|\.spec\.|\.stories\.|\/__tests__\/|\/e2e\/)/;

function count(file, pattern) {
  const source = stripComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
  return source.match(pattern)?.length ?? 0;
}

function check({ label, scanRoot, pattern, rgPattern, allowlist, hint }) {
  const files = findFiles({
    label: "lint-no-hard-reload",
    rgCommand: `rg -l --glob '!**/node_modules/**' --glob '*.{ts,tsx,js,jsx,mjs,vue}' '${rgPattern}' ${scanRoot}`,
    grepCommand: `grep -rlE ${grepExcludes()} --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' --include='*.vue' '${rgPattern}' ${scanRoot}`,
  })
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => !TEST_FILE.test(file));

  const counts = new Map(
    files.map((file) => [file, count(file, pattern)]).filter(([, n]) => n > 0),
  );
  const allowed = new Map(allowlist.map((entry) => [entry.file, entry.count]));

  const violations = [...counts].filter(([file, n]) => n > (allowed.get(file) ?? 0));
  const stale = [...allowed].filter(([file, n]) => (counts.get(file) ?? 0) < n);

  if (violations.length > 0) {
    console.error(`✘ ${label}: ${violations.length} file(s) above the allowlist. ${hint}`);
    for (const [file, n] of violations) {
      console.error(`  ${file}: ${n} (allowed ${allowed.get(file) ?? 0})`);
    }
  }
  if (stale.length > 0) {
    console.error(
      `✘ ${label}: ${stale.length} allowlist entr${stale.length === 1 ? "y is" : "ies are"} stale. ` +
        "Lower or delete them in governance.config.json — the list only shrinks:",
    );
    for (const [file, n] of stale)
      console.error(`  ${file}: allowed ${n}, found ${counts.get(file) ?? 0}`);
  }
  return violations.length === 0 && stale.length === 0
    ? [...counts.values()].reduce((sum, n) => sum + n, 0)
    : null;
}

const reloads = check({
  label: "location.reload()",
  scanRoot: "apps",
  pattern: /location\.reload\(/g,
  rgPattern: "location\\.reload\\(",
  allowlist: reloadAllowlist,
  hint: "Refresh data in place (useRevalidate / invalidateQueries / router.invalidate) instead of reloading the page:",
});
const refreshes = check({
  label: "router.refresh() in apps/web",
  scanRoot: "apps/web/src",
  pattern: /router\.refresh\(/g,
  rgPattern: "router\\.refresh\\(",
  allowlist: refreshAllowlist,
  hint: "Call useRevalidate() from @/lib/navigation/use-revalidate, which also refreshes the query cache:",
});

if (reloads === null || refreshes === null) process.exit(1);

console.log(
  `✓ hard reloads: ${reloads} allowlisted location.reload() call(s), ${refreshes} router.refresh() in apps/web`,
);
