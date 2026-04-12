#!/usr/bin/env tsx

/**
 * UI governance guardrails (regression prevention).
 *
 * What this verifies:
 * 1) App surfaces do not exceed per-surface raw-color budgets.
 * 2) App surfaces do not bypass approved motion entry points.
 * 3) Token authoring does not drift away from current oklch-first policy.
 * 4) Tier-1 primitives maintain 100% story coverage.
 * 5) Dependency boundaries stay within declared allowlists.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type AggregateBudgetEntry,
  type GovernancePolicy,
  loadUiGovernancePolicy,
} from "./lib/ui-governance-policy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const RAW_TAILWIND_COLOR_RE =
  /\b(?:bg|text|border|from|to|via|ring|stroke|fill)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;
const RAW_TAILWIND_BORDER_RADIUS_RE = /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/g;
const FRAMER_MOTION_IMPORT_RE = /from\s+["']framer-motion["']/;
const IMPORT_SOURCE_RE = /from\s+["']([^"']+)["']/g;
const HEX_RE = /#[0-9A-Fa-f]{6}\b/g;
const HSL_RE = /\bhsl\(/g;
const OKLCH_RE = /\boklch\(/g;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join(path.posix.sep);
}

function stripComments(content: string, filePath: string) {
  const ext = path.extname(filePath);
  if (ext === ".css") {
    return content.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
    return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  return content;
}

function collectFiles(relativePath: string, allowedExtensions: Set<string>) {
  const results: string[] = [];
  const absolute = path.join(repoRoot, relativePath);
  if (!existsSync(absolute)) return results;

  const walk = (current: string) => {
    const stat = statSync(current);
    if (stat.isDirectory()) {
      const name = path.basename(current);
      if (
        name === "node_modules" ||
        name === ".next" ||
        name === ".turbo" ||
        name === "dist" ||
        name === "build" ||
        name === "out"
      ) {
        return;
      }
      for (const entry of readdirSync(current)) {
        walk(path.join(current, entry));
      }
      return;
    }

    const ext = path.extname(current);
    if (!allowedExtensions.has(ext)) return;
    results.push(toPosixPath(path.relative(repoRoot, current)));
  };

  walk(absolute);
  return results.sort();
}

function countMatches(content: string, pattern: RegExp) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function verifyRawTailwindColorUsage(policy: GovernancePolicy) {
  const stats: Array<{ surface: string; total: number; budget: number }> = [];

  for (const budget of policy.rawTailwindColorBudgets) {
    const files = collectFiles(budget.root, new Set(budget.extensions));

    let total = 0;
    for (const file of files) {
      if (budget.excludeContains?.some((marker) => file.includes(marker))) {
        continue;
      }
      const content = stripComments(read(file), file);
      total += countMatches(content, RAW_TAILWIND_COLOR_RE);
    }

    assert(
      total <= budget.max,
      `[${budget.surface}] raw Tailwind palette utility regression: ${total} > ${budget.max}.`,
    );
    stats.push({ surface: budget.surface, total, budget: budget.max });
  }

  return stats;
}

function verifyMotionImports(policy: GovernancePolicy) {
  const allowed = new Set(policy.motionBoundary.allowedFramerMotionImports);
  const files = policy.motionBoundary.appSurfaces.flatMap((surface) =>
    collectFiles(surface, new Set([".ts", ".tsx"])),
  );

  const violations: string[] = [];

  for (const file of files) {
    const content = stripComments(read(file), file);
    if (!FRAMER_MOTION_IMPORT_RE.test(content)) continue;
    if (allowed.has(file)) continue;
    violations.push(file);
  }

  assert(
    violations.length === 0,
    `Unapproved framer-motion imports detected:\n${violations.map((item) => `- ${item}`).join("\n")}`,
  );
}

function verifyTokenFormatPolicy(policy: GovernancePolicy) {
  const tokenFiles = policy.tokenFormatBudget.tokenSurfaces.flatMap((surface) =>
    collectFiles(surface.root, new Set(surface.extensions)),
  );

  let hexTotal = 0;
  let hslTotal = 0;
  let oklchTotal = 0;

  const disallowedHex: string[] = [];
  const disallowedHsl: string[] = [];
  const allowedHex = new Set(policy.tokenFormatBudget.allowedHexFiles);
  const allowedHsl = new Set(policy.tokenFormatBudget.allowedHslFiles);

  for (const file of tokenFiles) {
    const content = stripComments(read(file), file);
    const hexCount = countMatches(content, HEX_RE);
    const hslCount = countMatches(content, HSL_RE);
    const oklchCount = countMatches(content, OKLCH_RE);

    hexTotal += hexCount;
    hslTotal += hslCount;
    oklchTotal += oklchCount;

    if (hexCount > 0 && !allowedHex.has(file)) {
      disallowedHex.push(file);
    }
    if (hslCount > 0 && !allowedHsl.has(file)) {
      disallowedHsl.push(file);
    }
  }

  assert(
    disallowedHex.length === 0,
    `Hex token literals are only allowed in compatibility files.\n${disallowedHex.map((item) => `- ${item}`).join("\n")}`,
  );
  assert(
    disallowedHsl.length === 0,
    `HSL token literals are only allowed in compatibility files.\n${disallowedHsl.map((item) => `- ${item}`).join("\n")}`,
  );

  assert(
    hexTotal <= policy.tokenFormatBudget.maxHexLiterals,
    `Token hex literal budget exceeded: ${hexTotal} > ${policy.tokenFormatBudget.maxHexLiterals}.`,
  );
  assert(
    hslTotal <= policy.tokenFormatBudget.maxHslLiterals,
    `Token hsl() literal budget exceeded: ${hslTotal} > ${policy.tokenFormatBudget.maxHslLiterals}.`,
  );
  assert(
    oklchTotal >= policy.tokenFormatBudget.minOklchLiterals,
    `oklch token floor violated: ${oklchTotal} < ${policy.tokenFormatBudget.minOklchLiterals}.`,
  );

  return { hexTotal, hslTotal, oklchTotal };
}

function verifyComponentTierCoverage(policy: GovernancePolicy) {
  const primitivesRoot = policy.componentTierCoverage.primitivesRoot;
  const results: Array<{
    tier: string;
    coverage: number;
    required: number;
    missingStories: string[];
  }> = [];

  for (const tier of policy.componentTierCoverage.tiers) {
    const missingStories: string[] = [];

    for (const component of tier.components) {
      const componentFile = `${primitivesRoot}/${component}.tsx`;
      assert(
        existsSync(path.join(repoRoot, componentFile)),
        `Tier component missing: ${componentFile}`,
      );

      const storyFile = `${primitivesRoot}/${component}.stories.tsx`;
      if (!existsSync(path.join(repoRoot, storyFile))) {
        missingStories.push(storyFile);
      }
    }

    const coverage = (tier.components.length - missingStories.length) / tier.components.length;
    assert(
      coverage >= tier.requiredCoverage,
      `[${tier.name}] story coverage ${Math.round(coverage * 100)}% < ${Math.round(tier.requiredCoverage * 100)}%.\nMissing:\n${missingStories.map((item) => `- ${item}`).join("\n")}`,
    );

    results.push({
      tier: tier.name,
      coverage,
      required: tier.requiredCoverage,
      missingStories,
    });
  }

  return results;
}

function verifyDependencyBoundaries(policy: GovernancePolicy) {
  const forbiddenRegexes = policy.dependencyBoundaries.forbiddenImportRegexes.map(
    (pattern) => new RegExp(pattern),
  );
  const appFiles = policy.dependencyBoundaries.appSurfaces.flatMap((surface) =>
    collectFiles(surface, new Set([".ts", ".tsx"])),
  );

  const importViolations: string[] = [];
  for (const file of appFiles) {
    const content = stripComments(read(file), file);
    const imports = [...content.matchAll(IMPORT_SOURCE_RE)];

    for (const match of imports) {
      const source = match[1];
      if (!source || !source.startsWith("@nebutra/")) continue;
      if (forbiddenRegexes.some((re) => re.test(source))) {
        importViolations.push(`${file} -> ${source}`);
      }
    }
  }

  assert(
    importViolations.length === 0,
    `Dependency boundary violation (deep cross-package import):\n${importViolations.map((item) => `- ${item}`).join("\n")}`,
  );

  const uiPackage = JSON.parse(read("packages/ui/package.json")) as {
    exports?: Record<string, unknown>;
  };
  const exportKeys = Object.keys(uiPackage.exports || {});
  const allowed = new Set(
    policy.dependencyBoundaries.uiAllowedExports ??
      policy.dependencyBoundaries.customUiAllowedExports,
  );

  const unexpected = exportKeys.filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !exportKeys.includes(key));

  assert(
    unexpected.length === 0 && missing.length === 0,
    `ui exports do not match layered allowlist.\nUnexpected:\n${unexpected.map((item) => `- ${item}`).join("\n") || "- (none)"}\nMissing:\n${missing.map((item) => `- ${item}`).join("\n") || "- (none)"}`,
  );
}

function countAggregateBudgetViolations(budget: AggregateBudgetEntry, pattern: RegExp): number {
  const excludeSet = new Set(budget.exclude ?? []);

  // Derive roots from paths (strip glob suffix, e.g. "packages/ui/src/**" -> "packages/ui/src")
  const roots = budget.paths.map((p) => p.replace(/\/\*\*$/, "").replace(/\/\*$/, ""));

  const allFiles = roots.flatMap((root) => collectFiles(root, new Set([".ts", ".tsx", ".css"])));

  let total = 0;
  for (const file of allFiles) {
    const posixFile = toPosixPath(file);
    const shouldExclude = [...excludeSet].some((ex) => {
      if (ex.startsWith("**/")) {
        const suffix = ex.slice(3);
        return posixFile.includes(suffix);
      }
      return posixFile.includes(ex);
    });
    if (shouldExclude) continue;

    const content = stripComments(read(file), file);
    const cloned = new RegExp(pattern.source, pattern.flags);
    total += countMatches(content, cloned);
  }

  return total;
}

function verifyAggregateBudgets(policy: GovernancePolicy) {
  if (!policy.budgets) return;

  const colorCount = countAggregateBudgetViolations(
    policy.budgets.rawTailwindColors,
    RAW_TAILWIND_COLOR_RE,
  );
  assert(
    colorCount <= policy.budgets.rawTailwindColors.max,
    `[budgets.rawTailwindColors] aggregate raw Tailwind color utility regression: ${colorCount} > ${policy.budgets.rawTailwindColors.max}. Use semantic CSS variable tokens instead of raw palette classes.`,
  );

  const radiusCount = countAggregateBudgetViolations(
    policy.budgets.rawTailwindBorderRadius,
    RAW_TAILWIND_BORDER_RADIUS_RE,
  );
  assert(
    radiusCount <= policy.budgets.rawTailwindBorderRadius.max,
    `[budgets.rawTailwindBorderRadius] aggregate raw Tailwind border-radius regression: ${radiusCount} > ${policy.budgets.rawTailwindBorderRadius.max}. Use var(--radius-*) tokens instead of raw rounded-* classes.`,
  );

  return { colorCount, radiusCount };
}

function main() {
  const policy = loadUiGovernancePolicy();
  const rawColorStats = verifyRawTailwindColorUsage(policy);
  verifyMotionImports(policy);
  const _tokenStats = verifyTokenFormatPolicy(policy);
  const tierStats = verifyComponentTierCoverage(policy);
  verifyDependencyBoundaries(policy);
  const budgetStats = verifyAggregateBudgets(policy);
  for (const _stat of rawColorStats) {
  }
  for (const _tier of tierStats) {
  }
  if (budgetStats && policy.budgets) {
  }
  console.log("UI governance verification passed ✓");
}

main();
