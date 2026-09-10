#!/usr/bin/env node

// Regenerate a shrink-only ratchet's allowlist from what is actually in the tree.
//
// The ratchets fail on a count that DROPS as well as one that rises, which is
// deliberate — a fixed number cannot silently drift out of sync with the code.
// The cost is that migrating a file means editing governance.config.json by hand,
// which is tedious enough that people work around the gate instead. This does it.
//
// Usage: node scripts/regen-ratchet-baseline.mjs <arbitraryTypography|primitiveReuse>

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const GUARDS = {
  arbitraryTypography: "scripts/lint-arbitrary-typography.mjs",
  primitiveReuse: "scripts/lint-primitive-reuse.mjs",
};

const key = process.argv[2];
if (!GUARDS[key]) {
  process.stderr.write(
    `Usage: node scripts/regen-ratchet-baseline.mjs <${Object.keys(GUARDS).join("|")}>\n`,
  );
  process.exit(1);
}

// Clear the allowlist first. Otherwise the guard reports only files that EXCEED their
// allowance, already-compliant entries never appear in the output, and regenerating
// silently drops them — which reads as "migrated" and quietly widens the gate.
const cfgPath = "governance.config.json";
const cfgBefore = JSON.parse(readFileSync(cfgPath, "utf-8"));
cfgBefore[key].allowlist = [];
writeFileSync(cfgPath, `${JSON.stringify(cfgBefore, null, 2)}\n`);

let out = "";
try {
  out = execSync(`node ${GUARDS[key]} 2>&1`, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
}

const entries = [];
for (const line of out.split("\n")) {
  const m = line.match(/^\s{2}(\S+): (\d+) found, \d+ allowed$/);
  if (m) entries.push({ file: m[1], count: Number(m[2]) });
}
entries.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
cfg[key].allowlist = entries;
writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);

const total = entries.reduce((a, e) => a + e.count, 0);
process.stdout.write(
  `${key}: ${total} occurrence(s) across ${entries.length} file(s) written to ${cfgPath}\n`,
);
