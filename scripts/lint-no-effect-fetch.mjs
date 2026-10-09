#!/usr/bin/env node

// CI guard: server reads go through the data layer, not `useEffect`.
//
// A fetch inside `useEffect` re-implements, badly, what TanStack Query (or a
// route loader / RSC fetch) gives for free: dedup across components, a cache
// that `invalidateQueries` can refresh after a mutation, retry, abort on
// unmount, and a pending/error state instead of a hand-rolled `LoadState`.
// It also starts the request only after the component mounts, so a route
// waterfalls. Use `useQuery(…QueryOptions())` with keys from
// `@/lib/query-keys`, prefetch it from the route's loader, and `useMutation`
// for writes. Apps without Query (forge, auth) use RSC fetch or server actions.
//
// What counts: a `useEffect(…)` whose body calls `fetch…(`, `load…(` or
// `refresh…(` (fetch, fetchWithTimeout, loadProjects, refreshWallet…) — the
// names server reads go by here. Comments do not count; tests and stories
// are exempt.
//
// SHRINK-ONLY ratchet: the effects that existed when the rule landed are the
// tracked migration list in governance.config.json → noEffectFetch.allowlist
// as {file, count}. A new one fails; so does an entry above what is left.
//
// Run: node scripts/lint-no-effect-fetch.mjs            (check)
//      node scripts/lint-no-effect-fetch.mjs --baseline (print the allowlist)

import fs from "node:fs";
import path from "node:path";
import { findFiles, grepExcludes } from "./lib/scan.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOT = process.cwd();
const SCAN_ROOT = "apps";
const TEST_FILE = /(\.test\.|\.spec\.|\.stories\.|\/__tests__\/|\/e2e\/)/;
const FETCH_CALL = /\b(?:fetch|load|refresh)[A-Z]?\w*\s*\(/;

/** The source text of each `useEffect(...)` call, by balanced parentheses. */
function effectBodies(source) {
  const bodies = [];
  const opener = /\buseEffect\s*\(/g;
  for (let match = opener.exec(source); match; match = opener.exec(source)) {
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (index < source.length && depth > 0) {
      const char = source[index];
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      index += 1;
    }
    bodies.push(source.slice(start, index - 1));
  }
  return bodies;
}

const files = findFiles({
  label: "lint-no-effect-fetch",
  rgCommand: `rg -l --glob '!**/node_modules/**' --glob '*.{ts,tsx}' 'useEffect' ${SCAN_ROOT}`,
  grepCommand: `grep -rl ${grepExcludes()} --include='*.ts' --include='*.tsx' 'useEffect' ${SCAN_ROOT}`,
})
  .map((file) => file.split(path.sep).join("/"))
  .filter((file) => !TEST_FILE.test(file) && !file.includes("/node_modules/"));

const counts = new Map();
for (const file of files) {
  const source = stripComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const n = effectBodies(source).filter((body) => FETCH_CALL.test(body)).length;
  if (n > 0) counts.set(file, n);
}

if (process.argv.includes("--baseline")) {
  const entries = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, count]) => ({ file, count }));
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, "governance.config.json"), "utf8"));
const allowed = new Map(config.noEffectFetch.allowlist.map((entry) => [entry.file, entry.count]));

const violations = [...counts].filter(([file, n]) => n > (allowed.get(file) ?? 0));
const stale = [...allowed].filter(([file, n]) => (counts.get(file) ?? 0) < n);

if (violations.length > 0) {
  console.error(
    `✘ ${violations.length} file(s) fetch inside useEffect. Read through useQuery (keys from ` +
      "@/lib/query-keys, prefetched by the route loader) and write through useMutation:",
  );
  for (const [file, n] of violations) {
    console.error(`  ${file}: ${n} (allowed ${allowed.get(file) ?? 0})`);
  }
}
if (stale.length > 0) {
  console.error(
    `✘ ${stale.length} noEffectFetch.allowlist entr${stale.length === 1 ? "y is" : "ies are"} stale ` +
      "(migrated, nice). Lower or delete them in governance.config.json — the list only shrinks:",
  );
  for (const [file, n] of stale) {
    console.error(`  ${file}: allowed ${n}, found ${counts.get(file) ?? 0}`);
  }
}
if (violations.length > 0 || stale.length > 0) process.exit(1);

const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
console.log(
  `✓ effect fetches: ${total} in ${counts.size} file(s), all on the tracked migration list`,
);
