#!/usr/bin/env node

// Gate: microcopy 七禁令 (seven prohibitions).
// Config-driven engine — shipped by create-sailor into scaffolded projects.
// Hardcodes NO paths or Chinese-specific patterns: scan roots, banned patterns,
// excluded path fragments, and the shrink-only allowlist all come from
// governance.config.json (microcopyRules section), with empty scaffold defaults.
//
// Mechanically-lintable subset only:
//   MC-H1: The engine CAN flag the provably wrong:
//     - 禁七  generic empty-state strings: 暂无…  /  "No X (yet|available)"
//     - 禁四  LinkedIn/corporate-speak: 赋能/闭环/抓手/颗粒度/打法/系统检测到/请您
//     - 禁标点 emoji: 🎉🚀🔥🌟⚡ etc. (any Unicode emoji codepoint in a string literal)
//     - 禁五  trailing ! / full-caps shout in JSX string literals
//     - 禁一 (partial) over-incentive words: 加油/你能行/冲鸭/梦想成真
//   The engine CANNOT judge:
//     - 禁二  empty motivational copy (空洞成功学) — semantic, needs human review
//     - 禁三  self-moved copy (自我感动)          — semantic, needs human review
//     - 禁五  subtle 尬梗/谐音                   — semantic, needs human review
//     - 禁六  naked references (裸引用)           — semantic, needs human review
//     - §6.5 IP/legal red lines                  — needs human review (黄金50 gate)
//
// SHRINK-ONLY ratchet:
//   A NEW file matching a banned pattern in a governed path => FAIL.
//   A listed file that no longer matches any pattern (migrated) => FAIL — remove it.
//   Existing offenders migrate ON-TOUCH; the allowlist may only shrink.
//
// Escape hatch: top-level `// @microcopy-exempt: <reason>` in any file skips
// enforcement — for technical error strings that are provably not user-facing
// creative copy. Use sparingly; API route error bodies are excluded structurally
// via excludePaths (/api/).
//
// Permanent exemptions (stories, __tests__, design-docs, sailor-docs) live in
// excludePaths, not the allowlist — they are intentionally illustrative.
//
// A fresh scaffold has ZERO microcopy debt → defaults are EMPTY.
//
// Run: node scripts/governance/lint-microcopy.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadGovernanceConfig } from "./_config.mjs";

const cfg = loadGovernanceConfig("microcopyRules");

const scanRoots = cfg.scanRoots;
const excludePaths = (cfg.excludePaths ?? []).map((p) => new RegExp(p));
const bannedPatterns = cfg.bannedPatterns ?? [];
const allowlist = new Set(cfg.allowlist ?? []);

// Strip JS line + block comments so commented-out strings don't false-positive.
// Replace each comment with same-length whitespace to preserve byte offsets.
const stripComments = (src) =>
  src
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

const isExcluded = (p) => excludePaths.some((re) => re.test(p));

// Collect all TS/TSX files under the scan roots.
const grepRoots = scanRoots.join(" ");

// Build all candidate files from the scan roots (fast existence check before
// per-pattern grep — avoids spawning one process per pattern × file).
let allCandidateFiles = [];
if (scanRoots.length > 0) {
  try {
    const raw = execSync(
      `find ${grepRoots} -type f \\( -name '*.ts' -o -name '*.tsx' \\) 2>/dev/null` +
        " | grep -v node_modules | grep -v '/dist/' | grep -v '/.next/' | grep -v '/generated/'",
      { encoding: "utf-8" },
    ).trim();
    allCandidateFiles = raw
      .split("\n")
      .map((p) => p.replace(/^\.\//, ""))
      .filter(Boolean)
      .filter((p) => !isExcluded(p));
  } catch {
    allCandidateFiles = [];
  }
}

// If no patterns are defined (fresh scaffold), nothing to check.
if (bannedPatterns.length === 0) {
  process.stdout.write(
    `✓ microcopy: no banned patterns configured (fresh scaffold). Add microcopyRules.bannedPatterns to governance.config.json to enforce the seven prohibitions.\n`,
  );
  process.exit(0);
}

// MC-H5: patterns are applied only against JSX text content and string literals,
// NOT identifiers, import paths, or prose comments. We strip comments before
// matching to avoid false positives from commented-out code. The regex patterns
// in bannedPatterns must be scoped by the caller to JSX/string context (see
// governance.config.json for the anchored patterns).

// For each banned pattern, grep files and collect per-file hits.
// We accumulate a Set of offending files (one entry per file, like brand ratchet).
const detected = new Set();

for (const { pattern } of bannedPatterns) {
  // Use grep to quickly find candidate files for this pattern.
  let raw = "";
  try {
    raw = execSync(
      `LANG=en_US.UTF-8 grep -rlE '${pattern}' --include='*.ts' --include='*.tsx' ${grepRoots} 2>/dev/null` +
        " | grep -v node_modules | grep -v '/dist/' | grep -v '/.next/' | grep -v '/generated/'",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    raw = "";
  }

  const candidates = raw
    .split("\n")
    .map((p) => p.replace(/^\.\//, ""))
    .filter(Boolean)
    .filter((p) => !isExcluded(p));

  for (const file of candidates) {
    let src = "";
    try {
      src = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    // Honor the file-level escape hatch.
    if (/\/\/\s*@microcopy-exempt/.test(src)) continue;

    // Check against comment-stripped source to avoid false positives.
    const stripped = stripComments(src);
    const re = new RegExp(pattern);
    if (re.test(stripped)) {
      detected.add(file);
    }
  }
}

const newViolations = [...detected].filter((f) => !allowlist.has(f)).sort();
const fixedButListed = [...allowlist].filter((f) => !detected.has(f)).sort();

let failed = false;

if (newViolations.length > 0) {
  failed = true;
  process.stderr.write(
    "\nMicrocopy violation (七禁令) — these files contain banned copy patterns\n" +
      "in governed paths. Route all empty / success / failure / milestone strings\n" +
      "through the startupOs.* i18n catalog or @nebutra/brand/microcopy SSOT,\n" +
      "using culturally-grounded 母题 copy per the Nebutra Microcopy System.\n" +
      "Or add `// @microcopy-exempt: <reason>` if the string is provably not\n" +
      "user-facing creative copy (e.g. a debug surface or technical API label):\n" +
      newViolations.map((f) => `  - ${f}`).join("\n") +
      "\n\nNote: the engine flags the provably wrong only (禁七/禁四/禁一 partial +\n" +
      "emoji/exclamation). 禁二/禁三/禁五/禁六 and IP red lines (SS6.5) require\n" +
      "human review via the golden-50 acceptance gate.\n",
  );
}

if (fixedButListed.length > 0) {
  failed = true;
  process.stderr.write(
    "\nThese files no longer contain raw microcopy violations (migrated) — remove\n" +
      "them from microcopyRules.allowlist in governance.config.json (the list is\n" +
      "shrink-only):\n" +
      fixedButListed.map((f) => `  - ${f}`).join("\n") +
      "\n",
  );
}

if (failed) process.exit(1);

process.stdout.write(
  `✓ microcopy: ${allowlist.size} known allowlisted file(s), 0 new. ` +
    "Migrate allowlisted files on-touch to shrink the list toward zero.\n",
);
