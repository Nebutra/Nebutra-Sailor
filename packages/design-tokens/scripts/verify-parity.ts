#!/usr/bin/env tsx
/**
 * verify-parity.ts
 *
 * Compares the Style Dictionary-generated CSS variables against the
 * hand-maintained packages/tokens/styles.css to ensure the new DTCG
 * pipeline emits an equivalent token set.
 *
 * Strategy:
 *   1. Parse both files into Map<varName, value> per scope (:root | .dark).
 *   2. For each variable in the legacy SSOT, look up the generated counterpart.
 *   3. Normalize values (collapse whitespace, lowercase hex) before comparing.
 *   4. Report:
 *        - matched     (X / Y)
 *        - missing     (legacy has it; generated does not)
 *        - mismatched  (different value)
 *        - extra       (generated only — informational)
 *
 * Exits 0 when matched/missing ratio meets the parity floor; otherwise 1.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Scope = ":root" | ".dark";

interface TokenMap {
  [name: string]: string;
}

interface ScopedTokens {
  ":root": TokenMap;
  ".dark": TokenMap;
}

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(PROJECT_ROOT, "..", "..");
const LEGACY_CSS = resolve(REPO_ROOT, "packages/tokens/styles.css");
const GENERATED_CSS = resolve(PROJECT_ROOT, "build/css/styles.generated.css");

/** Strip CSS comments, collapse multi-line var declarations into one line each. */
const stripComments = (input: string): string =>
  input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\r/g, "");

/** Collapse repeated whitespace; lowercase hex; normalize for comparison. */
const normalizeValue = (raw: string): string =>
  raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/#([0-9a-fA-F]{3,8})/g, (_, hex) => `#${hex.toLowerCase()}`)
    .replace(/;$/, "")
    .trim();

/**
 * Parse a CSS file, returning maps of `--var: value` declarations
 * grouped by their owning selector.
 *
 * Supports:  :root { ... }, .dark { ... }
 * Ignores:   nested @theme, @utility, @media, @keyframes (out of scope for parity).
 */
function parseScopes(css: string): ScopedTokens {
  const cleaned = stripComments(css);
  const result: ScopedTokens = { ":root": {}, ".dark": {} };

  // Match top-level :root { ... } and .dark { ... } blocks (handle braces shallowly).
  const blockRegex = /(:root|\.dark)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const selector = match[1] as Scope;
    const body = match[2] ?? "";
    // Skip blocks nested inside @supports / @media — those still match here, that's fine,
    // they represent valid overrides which we want to merge.
    const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let decl: RegExpExecArray | null;
    while ((decl = declRegex.exec(body)) !== null) {
      const name = decl[1];
      const rawValue = decl[2];
      if (!name || rawValue === undefined) continue;
      const value = normalizeValue(rawValue);
      // Last write wins (mirrors CSS cascade for same-selector @supports overrides).
      result[selector][name] = value;
    }
  }
  return result;
}

interface DiffReport {
  matched: string[];
  missing: string[]; // in legacy, not in generated
  mismatched: { name: string; legacy: string; generated: string }[];
  extra: string[]; // in generated, not in legacy
}

/**
 * Recursively resolve `var(--x)` references in a token map until it stabilizes
 * or reaches the iteration cap. This makes the legacy SSOT comparable to the
 * SD-generated CSS, which inlines all primitive values.
 */
function resolveVarRefs(map: TokenMap): TokenMap {
  const resolved: TokenMap = { ...map };
  const varRefRegex = /var\((--[a-zA-Z0-9_-]+)\)/g;
  for (let i = 0; i < 10; i++) {
    let changed = false;
    for (const [key, value] of Object.entries(resolved)) {
      const next = value.replace(varRefRegex, (full: string, ref: string): string => {
        const sub = resolved[ref];
        if (sub !== undefined && sub !== full) return sub;
        return full;
      });
      if (next !== value) {
        resolved[key] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return resolved;
}

function diff(legacy: TokenMap, generated: TokenMap): DiffReport {
  const report: DiffReport = { matched: [], missing: [], mismatched: [], extra: [] };
  // Apply var() resolution to BOTH sides for fair comparison.
  // Generated SD output already inlines primitives but post-processed extras
  // (--gradient-brand, --focus-ring) reference other vars; resolve those too.
  const legacyResolved = resolveVarRefs(legacy);
  const generatedResolved = resolveVarRefs(generated);
  for (const [name, legacyVal] of Object.entries(legacyResolved)) {
    if (!(name in generatedResolved)) {
      report.missing.push(name);
      continue;
    }
    const generatedVal = generatedResolved[name] ?? "";
    if (legacyVal === generatedVal) {
      report.matched.push(name);
    } else {
      report.mismatched.push({ name, legacy: legacyVal, generated: generatedVal });
    }
  }
  for (const name of Object.keys(generatedResolved)) {
    if (!(name in legacyResolved)) report.extra.push(name);
  }
  return report;
}

function printReport(scope: Scope, report: DiffReport): void {
  const total = report.matched.length + report.missing.length + report.mismatched.length;
  const pct = total === 0 ? 100 : ((report.matched.length / total) * 100).toFixed(1);
  process.stdout.write(
    `\n=== ${scope} — ${report.matched.length}/${total} matched (${pct}%) ===\n`,
  );

  if (report.missing.length > 0) {
    process.stdout.write(
      `\n  Missing (${report.missing.length}) — in legacy SSOT, absent in generated CSS:\n`,
    );
    for (const name of report.missing.slice(0, 50)) {
      process.stdout.write(`    - ${name}\n`);
    }
    if (report.missing.length > 50)
      process.stdout.write(`    ... ${report.missing.length - 50} more\n`);
  }

  if (report.mismatched.length > 0) {
    process.stdout.write(`\n  Mismatched (${report.mismatched.length}) — different value:\n`);
    for (const { name, legacy, generated } of report.mismatched.slice(0, 30)) {
      process.stdout.write(
        `    - ${name}\n      legacy:    ${legacy}\n      generated: ${generated}\n`,
      );
    }
    if (report.mismatched.length > 30)
      process.stdout.write(`    ... ${report.mismatched.length - 30} more\n`);
  }

  if (report.extra.length > 0) {
    process.stdout.write(
      `\n  Extra (${report.extra.length}) — only in generated (informational):\n`,
    );
    for (const name of report.extra.slice(0, 20)) {
      process.stdout.write(`    + ${name}\n`);
    }
    if (report.extra.length > 20)
      process.stdout.write(`    ... ${report.extra.length - 20} more\n`);
  }
}

async function main(): Promise<void> {
  let legacyCss: string;
  let generatedCss: string;

  try {
    legacyCss = await readFile(LEGACY_CSS, "utf8");
  } catch (err) {
    console.error(`Failed to read legacy SSOT at ${LEGACY_CSS}:`, err);
    process.exit(1);
  }

  try {
    generatedCss = await readFile(GENERATED_CSS, "utf8");
  } catch (err) {
    console.error(
      `Failed to read generated CSS at ${GENERATED_CSS}.\n` +
        `Did you run \`pnpm --filter @nebutra/design-tokens build\`?\n`,
      err,
    );
    process.exit(1);
  }

  const legacy = parseScopes(legacyCss);
  const generated = parseScopes(generatedCss);

  // The legacy .dark block does NOT redeclare nebutra-* primitives —
  // they cascade from :root. To compare against generated CSS (which
  // re-emits primitives in every scope), merge :root primitives into
  // the .dark map for var() resolution only. Apply same merge to generated.
  const darkLegacy: TokenMap = { ...legacy[":root"], ...legacy[".dark"] };
  const darkGenerated: TokenMap = { ...generated[":root"], ...generated[".dark"] };

  const rootReport = diff(legacy[":root"], generated[":root"]);
  const darkReport = diff(darkLegacy, darkGenerated);

  printReport(":root", rootReport);
  printReport(".dark", darkReport);

  const totalMatched = rootReport.matched.length + darkReport.matched.length;
  const totalCompared =
    rootReport.matched.length +
    rootReport.missing.length +
    rootReport.mismatched.length +
    darkReport.matched.length +
    darkReport.missing.length +
    darkReport.mismatched.length;
  const overallPct = totalCompared === 0 ? 0 : (totalMatched / totalCompared) * 100;

  process.stdout.write(
    `\n=== OVERALL: ${totalMatched}/${totalCompared} (${overallPct.toFixed(1)}%) tokens at parity ===\n\n`,
  );

  // Parity floor: 70% to start (Phase 1). Goal is 100%. Drift below the floor exits non-zero.
  const PARITY_FLOOR = 0.7;
  if (overallPct / 100 < PARITY_FLOOR) {
    process.stderr.write(`Parity below ${PARITY_FLOOR * 100}% floor.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("verify-parity failed:", err);
  process.exit(1);
});
