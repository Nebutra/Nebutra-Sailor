#!/usr/bin/env tsx

/**
 * UI governance guardrails (regression prevention).
 *
 * What this verifies:
 * 1) App surfaces do not exceed per-surface raw-color budgets.
 * 2) App surfaces do not bypass approved motion entry points.
 * 3) Token authoring stays within hex/hsl budgets (oklch multi-mood catalog retired).
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
const OUTLINE_HIDDEN_RE = /\b(?:focus-visible:|focus:)?outline-hidden\b/g;
const GLOBAL_FOCUS_RESET_RE = /\*:focus-visible\s*\{/g;
const FORM_CONTROL_CONTRACT_FILE = "packages/design/ui/src/primitives/form-control.ts";
const FORM_CONTROL_FOCUS_VISIBLE_RE =
  /\bfocus-visible:(?:border-ring|ring-\[length:var\(--(?:input|textarea|select)-focus-ring-width\)\]|ring-ring\/30|border-destructive|ring-destructive\/20)\b/g;
const FORM_CONTROL_INLINE_FOCUS_RE =
  /\b(?:focus:(?:border-ring|ring-\[length:var\(--(?:input|textarea|select)-focus-ring-width\)\]|ring-ring\/30)|aria-invalid:focus:(?:border-destructive|ring-destructive\/20))\b/g;
const FOCUS_GOVERNANCE_ROOTS = ["packages/design/ui/src", "apps/landing-page/src"] as const;
const FORM_CONTROL_FOCUS_REQUIREMENTS = [
  {
    slot: "input",
    file: "packages/design/ui/src/primitives/input.tsx",
    contractMarkers: [
      "outline-none",
      "focus:border-ring",
      "focus:ring-[length:var(--input-focus-ring-width)]",
      "focus:ring-ring/30",
      "aria-invalid:border-destructive/60",
      "aria-invalid:focus:border-destructive",
      "aria-invalid:focus:ring-destructive/20",
    ],
    consumerMarkers: [
      "formControlFocusClassNames.input",
      "formControlInvalidClassNames.input",
      'borderRadius: "var(--input-radius)"',
      'outline: "none"',
    ],
  },
  {
    slot: "textarea",
    file: "packages/design/ui/src/primitives/textarea.tsx",
    contractMarkers: [
      "outline-none",
      "focus:border-ring",
      "focus:ring-[length:var(--textarea-focus-ring-width)]",
      "focus:ring-ring/30",
      "aria-invalid:border-destructive/60",
      "aria-invalid:focus:border-destructive",
      "aria-invalid:focus:ring-destructive/20",
    ],
    consumerMarkers: [
      "formControlFocusClassNames.textarea",
      "formControlInvalidClassNames.textarea",
      'borderRadius: "var(--textarea-radius)"',
      'outline: "none"',
    ],
  },
  {
    slot: "select",
    file: "packages/design/ui/src/primitives/select.tsx",
    contractMarkers: [
      "outline-none",
      "focus:border-ring",
      "focus:ring-[length:var(--select-focus-ring-width)]",
      "focus:ring-ring/30",
      "aria-invalid:border-destructive/60",
      "aria-invalid:focus:border-destructive",
      "aria-invalid:focus:ring-destructive/20",
    ],
    consumerMarkers: [
      "formControlFocusClassNames.select",
      "formControlInvalidClassNames.select",
      'borderRadius: "var(--select-radius)"',
      'outline: "none"',
    ],
  },
] as const;
const CI_WORKFLOW_CONTRACTS = [
  {
    file: ".github/workflows/ui-governance.yml",
    requiredContains: [
      "pnpm exec tsx scripts/verify-ui-governance.ts",
      "pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs docs:governance",
      "pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs prebuild",
      "git diff --exit-code -- \\",
      "apps/design-docs/public/r \\",
      "apps/design-docs/public/registry.json \\",
      "apps/design-docs/public/agent \\",
      "apps/design-docs/public/agent-manifest.json \\",
      "apps/design-docs/public/previews-index.json \\",
      "apps/design-docs/src/__registry__/index.tsx \\",
      "apps/design-docs/src/__registry__/file-map.json",
      "pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs typecheck",
      "pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs build",
    ],
    forbiddenContains: ["continue-on-error: true"],
  },
  {
    file: ".github/workflows/visual-acceptance.yml",
    requiredContains: [
      "VISUAL_SERVER_MODE: production",
      "pnpm visual:design-docs:ci",
      "pnpm visual:landing:ci",
      "visual-acceptance-report/design-docs",
      "visual-acceptance-report/landing",
      "uses: actions/upload-artifact@",
      "# v4",
      "if: always()",
      "visual-acceptance-report/",
      "test-results/",
      "if-no-files-found: error",
    ],
    forbiddenContains: ["run: pnpm visual:ci", "if-no-files-found: ignore"],
  },
  {
    file: ".github/workflows/chromatic.yml",
    requiredContains: [
      "packages/design/ui/src/**",
      "apps/storybook/**",
      "apps/design-docs/content/docs/**",
      ".github/workflows/chromatic.yml",
    ],
    forbiddenContains: [],
  },
] as const;

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

function collectWorkspacePackageExports() {
  const manifests = ["packages", "backends"].flatMap((surface) =>
    collectFiles(surface, new Set([".json"])).filter((file) => file.endsWith("/package.json")),
  );
  const packages = new Map<string, Set<string>>();

  for (const manifest of manifests) {
    const json = JSON.parse(read(manifest)) as {
      name?: unknown;
      exports?: unknown;
    };
    if (typeof json.name !== "string" || !json.name.startsWith("@nebutra/")) {
      continue;
    }

    const exportKeys =
      typeof json.exports === "string"
        ? ["."]
        : json.exports && typeof json.exports === "object" && !Array.isArray(json.exports)
          ? Object.keys(json.exports)
          : ["."];

    packages.set(json.name, new Set(exportKeys));
  }

  return packages;
}

function packageImportParts(source: string) {
  const parts = source.split("/");
  if (parts.length < 2 || !source.startsWith("@")) {
    return null;
  }

  const packageName = `${parts[0]}/${parts[1]}`;
  const subpath = parts.length === 2 ? "." : `./${parts.slice(2).join("/")}`;
  return { packageName, subpath };
}

function exportPatternMatches(pattern: string, subpath: string) {
  if (pattern === subpath) return true;
  if (!pattern.includes("*")) return false;

  const [prefix, suffix = ""] = pattern.split("*");
  return subpath.startsWith(prefix) && subpath.endsWith(suffix);
}

function isDeclaredWorkspacePackageExport(
  source: string,
  packageExports: Map<string, Set<string>>,
) {
  const parts = packageImportParts(source);
  if (!parts) return false;

  const exports = packageExports.get(parts.packageName);
  if (!exports) return false;

  return [...exports].some((pattern) => exportPatternMatches(pattern, parts.subpath));
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
  const packageExports = collectWorkspacePackageExports();
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
      if (
        forbiddenRegexes.some((re) => re.test(source)) &&
        !isDeclaredWorkspacePackageExport(source, packageExports)
      ) {
        importViolations.push(`${file} -> ${source}`);
      }
    }
  }

  assert(
    importViolations.length === 0,
    `Dependency boundary violation (deep cross-package import):\n${importViolations.map((item) => `- ${item}`).join("\n")}`,
  );

  const uiPackage = JSON.parse(read("packages/design/ui/package.json")) as {
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

  // Derive roots from paths (strip glob suffix, e.g. "packages/design/ui/src/**" -> "packages/design/ui/src")
  const roots = budget.paths.map((p) => p.replace(/\/\*\*$/, "").replace(/\/\*$/, ""));

  const allFiles = roots.flatMap((root) => collectFiles(root, new Set([".ts", ".tsx", ".css"])));

  let total = 0;
  for (const file of allFiles) {
    const posixFile = toPosixPath(file);
    const shouldExclude = [...excludeSet].some((ex) => {
      if (ex === "**/*.stories.*") {
        return /\.stories\.[^/]+$/.test(posixFile);
      }
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

function verifyDashboardExperienceGovernance(policy: GovernancePolicy) {
  const violations: string[] = [];

  for (const rule of policy.dashboardExperience.rules) {
    const absolutePath = path.join(repoRoot, rule.file);
    if (!existsSync(absolutePath)) {
      violations.push(`[${rule.name}] missing governed file: ${rule.file}`);
      continue;
    }

    const content = read(rule.file);
    const missing = rule.requiredContains.filter((marker) => !content.includes(marker));
    const forbidden = rule.forbiddenContains.filter((marker) => content.includes(marker));

    if (missing.length > 0) {
      violations.push(
        `[${rule.name}] ${rule.description}\nMissing required markers in ${rule.file}:\n${missing.map((item) => `- ${item}`).join("\n")}`,
      );
    }

    if (forbidden.length > 0) {
      violations.push(
        `[${rule.name}] ${rule.description}\nForbidden regression markers found in ${rule.file}:\n${forbidden.map((item) => `- ${item}`).join("\n")}`,
      );
    }
  }

  assert(
    violations.length === 0,
    `Dashboard experience governance violation:\n\n${violations.join("\n\n")}`,
  );
}

function verifyFocusRingGovernance() {
  const files = FOCUS_GOVERNANCE_ROOTS.flatMap((root) =>
    collectFiles(root, new Set([".ts", ".tsx", ".css"])),
  );
  const outlineHiddenViolations: string[] = [];
  const globalFocusResetViolations: string[] = [];
  const formControlViolations: string[] = [];

  for (const file of files) {
    const content = stripComments(read(file), file);
    const outlineHiddenCount = countMatches(content, OUTLINE_HIDDEN_RE);
    const globalFocusResetCount = countMatches(content, GLOBAL_FOCUS_RESET_RE);

    if (outlineHiddenCount > 0) {
      outlineHiddenViolations.push(`${file} (${outlineHiddenCount})`);
    }

    if (globalFocusResetCount > 0) {
      globalFocusResetViolations.push(`${file} (${globalFocusResetCount})`);
    }
  }

  assert(
    outlineHiddenViolations.length === 0,
    `Focus ring governance violation: use outline-none, not outline-hidden. Hidden outlines can leak native square focus frames around rounded controls.\n${outlineHiddenViolations.map((item) => `- ${item}`).join("\n")}`,
  );

  assert(
    globalFocusResetViolations.length === 0,
    `Focus ring governance violation: do not reset *:focus-visible globally inside components.\n${globalFocusResetViolations.map((item) => `- ${item}`).join("\n")}`,
  );

  const formControlContract = stripComments(
    read(FORM_CONTROL_CONTRACT_FILE),
    FORM_CONTROL_CONTRACT_FILE,
  );
  const contractFocusVisibleCount = countMatches(
    formControlContract,
    FORM_CONTROL_FOCUS_VISIBLE_RE,
  );

  if (contractFocusVisibleCount > 0) {
    formControlViolations.push(
      `${FORM_CONTROL_CONTRACT_FILE} contains ${contractFocusVisibleCount} focus-visible marker(s); text-like form controls must use :focus so mouse focus cannot leak the native square outline`,
    );
  }

  for (const requirement of FORM_CONTROL_FOCUS_REQUIREMENTS) {
    const missingContractMarkers = requirement.contractMarkers.filter(
      (marker) => !formControlContract.includes(marker),
    );
    const content = stripComments(read(requirement.file), requirement.file);
    const missingConsumerMarkers = requirement.consumerMarkers.filter(
      (marker) => !content.includes(marker),
    );
    const inlineFocusCount = countMatches(content, FORM_CONTROL_INLINE_FOCUS_RE);

    if (missingContractMarkers.length > 0) {
      formControlViolations.push(
        `${FORM_CONTROL_CONTRACT_FILE} missing ${requirement.slot} contract marker(s): ${missingContractMarkers.join(", ")}`,
      );
    }
    if (missingConsumerMarkers.length > 0) {
      formControlViolations.push(
        `${requirement.file} missing shared form-control marker(s): ${missingConsumerMarkers.join(", ")}`,
      );
    }
    if (inlineFocusCount > 0) {
      formControlViolations.push(
        `${requirement.file} contains ${inlineFocusCount} inline form-control focus marker(s); use ${FORM_CONTROL_CONTRACT_FILE} instead`,
      );
    }
  }

  assert(
    formControlViolations.length === 0,
    `Focus ring governance violation: text-like form controls must suppress native outline at rest and draw a tokenized ring on :focus, not only :focus-visible.\n${formControlViolations.map((item) => `- ${item}`).join("\n")}`,
  );
}

function verifyCiGovernanceContracts() {
  const violations: string[] = [];

  for (const contract of CI_WORKFLOW_CONTRACTS) {
    const content = read(contract.file);
    const missing = contract.requiredContains.filter((marker) => !content.includes(marker));
    const forbidden = contract.forbiddenContains.filter((marker) => content.includes(marker));

    if (missing.length > 0) {
      violations.push(
        `${contract.file} is missing required CI governance marker(s):\n${missing.map((item) => `- ${item}`).join("\n")}`,
      );
    }

    if (forbidden.length > 0) {
      violations.push(
        `${contract.file} contains forbidden CI governance bypass marker(s):\n${forbidden.map((item) => `- ${item}`).join("\n")}`,
      );
    }
  }

  assert(
    violations.length === 0,
    `CI governance workflow contract violation:\n\n${violations.join("\n\n")}`,
  );
}

function main() {
  const policy = loadUiGovernancePolicy();
  verifyCiGovernanceContracts();
  verifyFocusRingGovernance();
  const rawColorStats = verifyRawTailwindColorUsage(policy);
  verifyMotionImports(policy);
  const _tokenStats = verifyTokenFormatPolicy(policy);
  const tierStats = verifyComponentTierCoverage(policy);
  verifyDependencyBoundaries(policy);
  verifyDashboardExperienceGovernance(policy);
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
