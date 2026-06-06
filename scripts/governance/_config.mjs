#!/usr/bin/env node

// Shared config loader for the generalized governance lints shipped by
// create-sailor into scaffolded projects.
//
// Reads `governance.config.json` from the project root (process.cwd()) and
// merges it OVER built-in scaffold-layout defaults. The defaults are
// relative-pattern regexes against the project root — NO monorepo-absolute
// paths — so the lints work in a fresh scaffold without any config file.
//
// A fresh scaffold has ZERO existing bypasses, so every ratchet allowlist
// default is empty.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Scaffold-layout defaults. These match the standard create-sailor output
// structure (apps/web, packages/..., etc.) and are deliberately generic.
const DEFAULTS = {
  rawInputs: {
    // Directories scanned for raw form controls. Standard scaffold uses apps/.
    scanRoots: ["apps"],
    // UI primitives package the project uses for form controls.
    primitivesImport: "@nebutra/ui/primitives",
    // Whitelisted path fragments (regex strings) — exempt from the check.
    // Storybook stories and docs-shell preview/demo components (the Fumadocs
    // skeleton the scaffold keeps) intentionally render raw native form controls
    // to demonstrate browser behavior — they are documentation, not product UI.
    whitelist: [
      "/storybook/src/stories/",
      "/design-docs/src/components/previews/",
      "/sailor-docs/src/components/previews/",
      "\\.test\\.tsx?$",
      "/__tests__/",
    ],
  },
  repositorySeam: {
    // CORE business domains where the repository seam is REQUIRED. Patterns are
    // regex strings against the project-root-relative path. Everything outside
    // these is intentionally NOT governed — keep simple CRUD simple.
    coreDomains: [
      "^packages/.*/(billing|license|metering|auth|audit|permissions|identity|tenant)/",
      "^backends/gateway/src/routes/(billing|ai|admin|legal|integrations|webhooks)/",
      "^apps/web/src/app/api/",
    ],
    // The seam itself — the only place that may touch the DB client directly.
    seamPaths: ["^packages/platform/repositories/", "^packages/platform/db/"],
    // Tenant/system DB accessor helpers the project routes data access through.
    // Override if a downstream project renames its tenant-db helper.
    dbAccessors: ["getTenantDb", "getSystemDb"],
    // Core-domain files that currently bypass the seam. SHRINK-ONLY ratchet.
    //
    // This BUILT-IN default is intentionally EMPTY: when no governance.config.json
    // is present the safe stance is "nothing is pre-allowed → every core-domain
    // bypass is a NEW violation". create-sailor ALWAYS emits a
    // governance.config.json whose repositorySeam.allowlist is seeded with the
    // exact set of shipped core-domain files that legitimately bypass the seam
    // (the scaffold's real baseline), so the generated project passes out of the
    // box while still ratcheting against new bypasses. Keeping this fallback
    // empty is what makes a configless project treat any bypass as new.
    allowlist: [],
  },
  brandLiterals: {
    // Directories scanned for raw brand literals (app code + commerce + email).
    // Standard scaffold uses apps/ only (no commerce/integrations sub-packages).
    governedPaths: ["apps", "packages/commerce", "packages/integrations/email"],
    // Raw brand literal patterns to detect (regex strings). Covers:
    //   - Product name: Nebutra
    //   - Chinese brand names: 云毓智能, 云毓
    //   - Brand domains: nebutra.com, nebutra.ai
    //   - Brand hex colors: #0033FE (primary), #0BF1C3 (accent)
    // Use @nebutra/brand metadata + CSS vars instead of these literals.
    allowExpressions: [
      "Nebutra",
      "云毓智能",
      "云毓",
      "nebutra\\.com",
      "nebutra\\.ai",
      "#0033FE",
      "#0BF1C3",
    ],
    // Path patterns (regex strings) that are permanently exempt from the check.
    // Stories, tests, previews, and the brand/tokens source packages themselves
    // are intentionally illustrative or are the source of truth.
    knownExemptPatterns: [
      "\\.stories\\.tsx?$",
      "/__tests__/",
      "\\.test\\.tsx?$",
      "/previews/",
      "^packages/design/brand/",
      "^packages/design/tokens/",
      "^packages/design/design-tokens/",
    ],
    // Files that currently contain raw brand literals. SHRINK-ONLY ratchet.
    //
    // Default is EMPTY: fresh scaffolds start with zero brand debt. The monorepo's
    // own governance.config.json seeds this with the actual remaining offender set
    // (migrated on-touch). Keeping this empty ensures new scaffolds enforce
    // single-source brand identity from day one.
    allowlist: [],
  },
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Shallow-merge each top-level lint section: a present section in the config
// file replaces the matching default keys it specifies, while unspecified keys
// fall back to defaults. Arrays are replaced wholesale (not concatenated).
const mergeSection = (defaults, override) => {
  if (!isPlainObject(override)) return { ...defaults };
  const merged = { ...defaults };
  for (const key of Object.keys(override)) {
    merged[key] = override[key];
  }
  return merged;
};

let fileConfig = {};
try {
  const configPath = resolve(process.cwd(), "governance.config.json");
  fileConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  if (!isPlainObject(fileConfig)) fileConfig = {};
} catch {
  // No config file (or unreadable) → use built-in scaffold-layout defaults.
  fileConfig = {};
}

export const config = {
  rawInputs: mergeSection(DEFAULTS.rawInputs, fileConfig.rawInputs),
  repositorySeam: mergeSection(DEFAULTS.repositorySeam, fileConfig.repositorySeam),
  brandLiterals: mergeSection(DEFAULTS.brandLiterals, fileConfig.brandLiterals),
};

export { DEFAULTS };

/**
 * Load one governance section, merged over its built-in scaffold-layout
 * defaults, optionally from a project root other than process.cwd().
 *
 * @param {keyof typeof DEFAULTS} section
 * @param {string} [cwd] - project root containing governance.config.json
 * @returns {object} merged config for that section
 */
export function loadGovernanceConfig(section, cwd = process.cwd()) {
  const defaults = DEFAULTS[section];
  if (!defaults) throw new Error(`Unknown governance config section: ${section}`);

  let override = {};
  try {
    const parsed = JSON.parse(readFileSync(resolve(cwd, "governance.config.json"), "utf-8"));
    if (isPlainObject(parsed)) override = parsed[section] ?? {};
  } catch {
    override = {};
  }
  return mergeSection(defaults, override);
}
