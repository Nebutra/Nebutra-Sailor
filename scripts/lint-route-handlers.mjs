#!/usr/bin/env node

// CI guard: the gateway is the only business API (ADR 2026-09-24 Sailor
// convergence §6).
//
// `apps/web` route handlers are limited to what is intrinsically Next: auth
// callbacks, OG/image/metadata routes, framework hooks. Business endpoints
// belong in backends/gateway (Hono).
//
// Shrink-only ratchet: the handlers that existed when the rule landed are
// listed in governance.config.json → routeHandlers.allowlist. A new business
// handler fails CI. An allowlisted handler migrates on-touch — move it to the
// gateway, then delete its entry. An entry whose file no longer exists also
// fails, so the list can only shrink.
//
// Run: node scripts/lint-route-handlers.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "governance.config.json"), "utf8"));
const { scanRoot, intrinsic, allowlist } = config.routeHandlers;

const intrinsicPatterns = intrinsic.map((source) => new RegExp(source));

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/^route\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const handlers = walk(path.join(ROOT, scanRoot)).map((file) =>
  path.relative(ROOT, file).split(path.sep).join("/"),
);
const allowed = new Set(allowlist);

const violations = handlers.filter(
  (file) => !allowed.has(file) && !intrinsicPatterns.some((pattern) => pattern.test(file)),
);
const stale = allowlist.filter((file) => !handlers.includes(file));

if (violations.length > 0) {
  console.error(
    `✘ ${violations.length} new business route handler(s) in ${scanRoot}. ` +
      "Business endpoints live in backends/gateway (ADR 2026-09-24 Sailor convergence §6):",
  );
  for (const file of violations) console.error(`  ${file}`);
}
if (stale.length > 0) {
  console.error(
    `✘ ${stale.length} routeHandlers.allowlist entr${stale.length === 1 ? "y" : "ies"} no longer exist. ` +
      "Delete them from governance.config.json — the list only shrinks:",
  );
  for (const file of stale) console.error(`  ${file}`);
}
if (violations.length > 0 || stale.length > 0) process.exit(1);

console.log(
  `✓ route handlers: ${handlers.length} in ${scanRoot}, ${allowlist.length} allowlisted for migration to the gateway`,
);
