#!/usr/bin/env node

// Gate: database. Generalized, CONFIG-DRIVEN port of the monorepo's
// scripts/lint-repository-seam.mjs — shipped by create-sailor into scaffolded
// projects. It hardcodes NO paths: core domains, the seam, the DB accessors and
// the shrink-only allowlist all come from governance.config.json
// (repositorySeam section), with sensible scaffold-layout defaults.
//
// CI guard: the Repository Seam — applied SELECTIVELY, not dogmatically.
//
// Repository seam is a best practice for CORE, long-evolving business modules —
// NOT for every table. Wrapping a trivial CRUD table in a repository that just
// forwards to the ORM is over-abstraction. So this guard only enforces the seam
// in the configured `coreDomains`: the modules whose data access is most likely
// to grow caching / multi-tenancy / RLS / async workers / external stores.
//
// Decision test for a piece of data access:
//   "Could this ever change implementation, or add caching / permissions /
//    multi-tenancy / audit / async tasks?"  yes -> seam.  no -> direct ORM is fine.
//
// The seam (may touch the DB client directly): the configured `seamPaths`.
//
// SHRINK-ONLY ratchet:
//   • A NEW core-domain file that bypasses the seam => FAIL.
//   • A listed file that no longer bypasses (migrated) => FAIL — remove it.
//   • Existing core bypasses migrate ON-TOUCH; the allowlist may only shrink.
// Escape hatch: top-level `// @seam-exempt: <reason>` (raw SQL / migration / store).
//
// A fresh scaffold has ZERO bypasses → the allowlist default is EMPTY.
//
// Run: node scripts/governance/lint-repository-seam.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadGovernanceConfig } from "./_config.mjs";

const cfg = loadGovernanceConfig("repositorySeam");

const coreDomains = cfg.coreDomains.map((p) => new RegExp(p));
const seamPaths = cfg.seamPaths.map((p) => new RegExp(p));
const dbAccessors = cfg.dbAccessors;
const allowlist = new Set(cfg.allowlist);

// ORM operations that indicate direct data access bypassing the seam.
const ORM_OPS = [
  "findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert",
  "delete", "deleteMany", "aggregate", "groupBy", "count",
  "\\$transaction", "\\$queryRaw", "\\$executeRaw",
];
const OP_RE = new RegExp(`\\.(${ORM_OPS.join("|")})\\(`);

const isCore = (p) => coreDomains.some((re) => re.test(p));

// The seam + non-shipped files are never violations.
const EXEMPT = [...seamPaths, /\.test\.tsx?$/, /\/__tests__\//, /\/generated\//];
const isExempt = (p) => EXEMPT.some((re) => re.test(p));

// Build a grep alternation from the configured DB accessors.
const accessorAlt = dbAccessors
  .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

let raw = "";
try {
  raw = execSync(
    `grep -rlE '${accessorAlt}' --include='*.ts' --include='*.tsx' apps backends packages 2>/dev/null ` +
      "| grep -v node_modules | grep -v '/dist/' | grep -v '/generated/' | grep -v '/.next/'",
    { encoding: "utf-8" },
  ).trim();
} catch {
  raw = "";
}

const candidates = raw
  .split("\n")
  .map((p) => p.replace(/^\.\//, ""))
  .filter(Boolean)
  .filter((p) => isCore(p) && !isExempt(p));

const detected = new Set();
for (const file of candidates) {
  const src = readFileSync(file, "utf-8");
  if (/\/\/\s*@seam-exempt/.test(src)) continue;
  if (OP_RE.test(src)) detected.add(file);
}

const newViolations = [...detected].filter((f) => !allowlist.has(f)).sort();
const fixedButListed = [...allowlist].filter((f) => !detected.has(f)).sort();

let failed = false;

if (newViolations.length > 0) {
  failed = true;
  process.stderr.write(
    "\n❌ Repository-seam violation in a CORE business domain — these files access\n" +
      "   the ORM directly. Route their data access through a repository in your\n" +
      "   seam (see governance.config.json repositorySeam.seamPaths), or add\n" +
      "   `// @seam-exempt: <reason>`:\n" +
      newViolations.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (fixedButListed.length > 0) {
  failed = true;
  process.stderr.write(
    "\n❌ These core files no longer bypass the seam (migrated 🎉) — remove them from\n" +
      "   repositorySeam.allowlist in governance.config.json (the list is shrink-only):\n" +
      fixedButListed.map((f) => `   - ${f}`).join("\n") +
      "\n",
  );
}

if (failed) process.exit(1);

process.stdout.write(
  `✓ repository-seam: ${detected.size} known core-domain bypass(es), 0 new. ` +
    "Simple CRUD outside core domains is intentionally ungoverned.\n",
);
