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
    // Fresh scaffold only exempts stories + tests; no per-app carve-outs.
    whitelist: ["/storybook/src/stories/", "\\.test\\.tsx?$", "/__tests__/"],
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
    // Fresh scaffold has ZERO bypasses → empty baseline.
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
