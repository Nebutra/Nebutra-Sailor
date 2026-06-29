#!/usr/bin/env tsx

/**
 * Brand Apply Script
 *
 * Applies brand.config.ts settings throughout the codebase.
 * Run with: pnpm brand:apply
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { generateFavicons } from "../packages/design/brand/scripts/generate-favicons";
import { type BrandColorPalette, type BrandConfig, DEFAULT_BRAND } from "./brand-types";

// `import.meta.dirname` is unset under tsx CJS transform on Node 25.
// Compute it from `import.meta.url` for cross-runtime compatibility.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BRAND_APPLY_LOCK_DIR = path.join(ROOT, "node_modules", ".cache", "nebutra-brand-apply.lock");
const BRAND_APPLY_LOCK_TIMEOUT_MS = 120_000;
const BRAND_APPLY_STALE_LOCK_MS = 10 * 60_000;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isLockOwnerAlive(lockDir: string): boolean {
  try {
    const pid = Number.parseInt(fs.readFileSync(path.join(lockDir, "pid"), "utf-8"), 10);
    if (!Number.isInteger(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function acquireBrandApplyLock(): () => void {
  const startedAt = Date.now();

  fs.mkdirSync(path.dirname(BRAND_APPLY_LOCK_DIR), { recursive: true });

  while (true) {
    try {
      fs.mkdirSync(BRAND_APPLY_LOCK_DIR);
      fs.writeFileSync(path.join(BRAND_APPLY_LOCK_DIR, "pid"), `${process.pid}\n`, "utf-8");

      return () => {
        fs.rmSync(BRAND_APPLY_LOCK_DIR, { force: true, recursive: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      if (!isLockOwnerAlive(BRAND_APPLY_LOCK_DIR)) {
        fs.rmSync(BRAND_APPLY_LOCK_DIR, { force: true, recursive: true });
        continue;
      }

      const lockAgeMs = Date.now() - fs.statSync(BRAND_APPLY_LOCK_DIR).mtimeMs;
      if (lockAgeMs > BRAND_APPLY_STALE_LOCK_MS) {
        fs.rmSync(BRAND_APPLY_LOCK_DIR, { force: true, recursive: true });
        continue;
      }

      if (Date.now() - startedAt > BRAND_APPLY_LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for brand:apply lock at ${BRAND_APPLY_LOCK_DIR}`);
      }

      sleepSync(250);
    }
  }
}

// ANSI colors
const _c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function logStep(_step: string) {}

function logSuccess(_message: string) {}

function logSkip(_message: string) {}

function _logError(_message: string) {}

// ─── Phase 1 exports — color SSOT collapse ──────────────────────────────────

/**
 * The 11 scale steps written to core.json for each brand color scale.
 *
 * NOTE: The "0" key (NeutralColorScale.0 = "#ffffff") is intentionally
 * excluded from the scale. It maps to `color.white` in core.json, NOT to a
 * scale step. deriveColorNodes iterates only these 11 steps for all three
 * scales. (M6 — explicit exclusion; see brand-apply-pipeline.test.ts assertion.)
 */
const COLOR_SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

type ColorScaleStep = (typeof COLOR_SCALE_STEPS)[number];

/** Shape of a DTCG leaf node (minimal, as used by core.json). */
interface DtcgLeaf {
  $value: string;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

/** Shape of a derived scale — the three brand scales brand:apply writes. */
export interface DerivedColorScales {
  "nebutra-blue": Record<string, DtcgLeaf>;
  "nebutra-cyan": Record<string, DtcgLeaf>;
  "nebutra-neutral": Record<ColorScaleStep, DtcgLeaf> & { $description?: string };
}

/**
 * Derive the three brand color scales (`nebutra-blue`, `nebutra-cyan`,
 * `nebutra-neutral`) from a `BrandColorPalette` and the existing on-disk
 * `core.json` structure.
 *
 * Design invariants:
 * - All hex written to core.json is **lowercased** (`#0033fe`, not `#0033FE`).
 *   This is a deliberate asymmetry: `metadata.ts` keeps uppercase from
 *   DEFAULT_BRAND.colors; core.json follows its own existing convention.
 *   Do NOT "fix" the metadata.ts serializer to match — they serve different
 *   consumers.
 * - `nebutra-neutral` has **no `"0"` key**. `NeutralColorScale.0` ("#ffffff")
 *   maps to `color.white` in core.json, not a scale step. This function
 *   iterates `COLOR_SCALE_STEPS` (50–950) only for all three scales.
 * - The 500-stop of blue/cyan has leaf-level `$description` + `$extensions`
 *   (display-p3). The existing on-disk node is spread and only `$value` is
 *   replaced; `$extensions` is overridden only if `p3Overrides` is set.
 * - `nebutra-neutral` carries a scale-root `$description` copied from
 *   `existingCore.color["nebutra-neutral"]["$description"]`. V8 always places
 *   integer-index-coercible keys ("50","100",…) before string keys in
 *   Object.keys() output, so $description ends up LAST in the serialized JSON
 *   regardless of insertion order. The idempotency test in
 *   brand-metadata-drift.test.ts verifies that the round-trip is stable.
 *
 * @param colors  The palette from DEFAULT_BRAND.colors (or brand.config.ts).
 * @param existingCore  The parsed on-disk core.json (used to preserve metadata
 *   on 500-stops and the neutral $description).
 */
export function deriveColorNodes(
  colors: BrandColorPalette,
  existingCore: {
    color: {
      "nebutra-blue": Record<string, unknown>;
      "nebutra-cyan": Record<string, unknown>;
      "nebutra-neutral": Record<string, unknown> & { $description?: string };
    };
  },
): DerivedColorScales {
  // I2: Boundary validation — brand.config.ts is an external boundary; validate
  // every required scale step before touching anything, so a hand-authored config
  // with a missing or malformed stop fails loudly here rather than silently
  // writing `undefined` / `"undefined"` into core.json.
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;
  const PALETTE_SCALES: Array<{
    name: "primary" | "accent" | "neutral";
    scale: typeof colors.primary;
  }> = [
    { name: "primary", scale: colors.primary },
    { name: "accent", scale: colors.accent },
    { name: "neutral", scale: colors.neutral },
  ];
  for (const { name, scale } of PALETTE_SCALES) {
    for (const step of COLOR_SCALE_STEPS) {
      const value = scale[Number(step) as keyof typeof scale];
      if (typeof value !== "string" || !HEX_RE.test(value)) {
        throw new Error(
          `deriveColorNodes: colors.${name}[${step}] must be a #rrggbb hex string — got ${JSON.stringify(value)}. Inspect brand-types.ts (DEFAULT_BRAND.colors) or brand.config.ts.`,
        );
      }
    }
  }

  // I1: Loud guard — the 500-stop of blue/cyan carries $description/$extensions
  // that we must preserve. If core.json is missing either stop, we cannot
  // perform a safe merge and must fail rather than silently drop metadata.
  if (existingCore.color["nebutra-blue"]["500"] === undefined) {
    throw new Error(
      "core.json color.nebutra-blue is missing the 500 stop — cannot preserve $description/$extensions. Inspect core.json.",
    );
  }
  if (existingCore.color["nebutra-cyan"]["500"] === undefined) {
    throw new Error(
      "core.json color.nebutra-cyan is missing the 500 stop — cannot preserve $description/$extensions. Inspect core.json.",
    );
  }

  // Helper to build a standard leaf (no special metadata).
  const leaf = (hex: string): DtcgLeaf => ({ $value: hex.toLowerCase(), $type: "color" });

  // Build nebutra-blue scale — spread existing 500-stop to preserve $description/$extensions.
  const existingBlue500 = existingCore.color["nebutra-blue"]["500"] as DtcgLeaf | undefined;
  const blueScale: Record<string, DtcgLeaf> = {};
  for (const step of COLOR_SCALE_STEPS) {
    const hex = colors.primary[Number(step) as keyof typeof colors.primary];
    if (step === "500") {
      // Spread existing node (preserves $description + $extensions), then replace $value.
      // existingBlue500 is guaranteed non-undefined by the I1 guard above.
      const base: DtcgLeaf = {
        ...existingBlue500,
        $value: hex.toLowerCase(),
      };
      if (colors.p3Overrides?.primary500 !== undefined) {
        base.$extensions = {
          ...(existingBlue500?.$extensions ?? {}),
          "com.nebutra.display-p3": colors.p3Overrides.primary500,
        };
      }
      blueScale[step] = base;
    } else {
      blueScale[step] = leaf(hex);
    }
  }

  // Build nebutra-cyan scale — same pattern as blue.
  const existingCyan500 = existingCore.color["nebutra-cyan"]["500"] as DtcgLeaf | undefined;
  const cyanScale: Record<string, DtcgLeaf> = {};
  for (const step of COLOR_SCALE_STEPS) {
    const hex = colors.accent[Number(step) as keyof typeof colors.accent];
    if (step === "500") {
      // existingCyan500 is guaranteed non-undefined by the I1 guard above.
      const base: DtcgLeaf = {
        ...existingCyan500,
        $value: hex.toLowerCase(),
      };
      if (colors.p3Overrides?.accent500 !== undefined) {
        base.$extensions = {
          ...(existingCyan500?.$extensions ?? {}),
          "com.nebutra.display-p3": colors.p3Overrides.accent500,
        };
      }
      cyanScale[step] = base;
    } else {
      cyanScale[step] = leaf(hex);
    }
  }

  // Build nebutra-neutral scale — NO "0" key; copy $description from existingCore.
  // Key order: { $description, ...steps } for byte-stable idempotent JSON serialization.
  // V8 sorts purely numeric keys before string keys in insertion order, so we
  // must build the object by setting $description on it FIRST, then adding the
  // step keys — rather than spreading { $description, ...steps } which lets V8
  // re-order the numeric-ish step keys ("50","100",…) before "$description".
  const neutralDesc = existingCore.color["nebutra-neutral"].$description as string | undefined;
  const neutralObj: Record<string, DtcgLeaf | string | undefined> = {};
  if (neutralDesc !== undefined) {
    neutralObj.$description = neutralDesc;
  }
  for (const step of COLOR_SCALE_STEPS) {
    const hex = colors.neutral[Number(step) as keyof typeof colors.neutral];
    neutralObj[step] = leaf(hex);
  }
  const neutralScale = neutralObj as DerivedColorScales["nebutra-neutral"];

  return {
    "nebutra-blue": blueScale,
    "nebutra-cyan": cyanScale,
    "nebutra-neutral": neutralScale,
  };
}

const CORE_JSON_PATH = path.join(
  ROOT,
  "packages",
  "design",
  "design-tokens",
  "tokens",
  "core.json",
);

/**
 * Read core.json, derive the three brand color scales from `config.colors`,
 * surgical-merge only those three scales back, and write the result.
 *
 * All other top-level keys in core.json (`$schema`, `$description`,
 * `nebutra-gray`, `white`, `black`, `status`, `size`, `duration`, etc.)
 * are untouched — only the `color.nebutra-blue`, `color.nebutra-cyan`,
 * and `color.nebutra-neutral` sub-trees are replaced.
 *
 * The output is `JSON.stringify(updated, null, 2) + "\n"` — idempotent
 * given stable key order from V8's insertion-order preservation.
 */
export function updateCoreJson(config: BrandConfig): void {
  logStep("Updating design-tokens/tokens/core.json from DEFAULT_BRAND.colors");

  const raw = fs.readFileSync(CORE_JSON_PATH, "utf-8");
  const existingCore = JSON.parse(raw) as {
    color: {
      "nebutra-blue": Record<string, unknown>;
      "nebutra-cyan": Record<string, unknown>;
      "nebutra-neutral": Record<string, unknown> & { $description?: string };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  const derived = deriveColorNodes(config.colors, existingCore);

  // Surgical merge: spread the full existing core, then overlay only the three
  // brand scales. All other top-level keys and all non-brand color keys are
  // preserved unchanged.
  const updated = {
    ...existingCore,
    color: {
      ...existingCore.color,
      "nebutra-blue": derived["nebutra-blue"],
      "nebutra-cyan": derived["nebutra-cyan"],
      "nebutra-neutral": derived["nebutra-neutral"],
    },
  };

  // M2: No Biome pass here — `JSON.stringify(obj, null, 2) + "\n"` is already
  // byte-identical to Biome's JSON formatter output (verified). Running Biome
  // on core.json would be a no-op and adds ~200 ms to brand:apply for nothing.
  fs.writeFileSync(CORE_JSON_PATH, JSON.stringify(updated, null, 2) + "\n", "utf-8");
  logSuccess("Updated packages/design/design-tokens/tokens/core.json");
}

/**
 * Run the @nebutra/design-tokens build so that Style Dictionary regenerates
 * `packages/design/tokens/styles.css` from the updated `core.json`.
 *
 * Runs `node style-dictionary.config.mjs` directly in the design-tokens
 * package directory, bypassing the pnpm `verify-deps-before-run` check.
 * This is equivalent to `pnpm --filter @nebutra/design-tokens build` (which
 * runs `node style-dictionary.config.mjs` as its build script), but avoids
 * the pre-existing lefthook/pnpm-install issue on local dev machines.
 */
export function runDesignTokensBuild(): void {
  logStep("Running @nebutra/design-tokens build (Style Dictionary → styles.css)");
  const designTokensDir = path.join(ROOT, "packages", "design", "design-tokens");
  execFileSync("node", ["style-dictionary.config.mjs"], {
    cwd: designTokensDir,
    stdio: "inherit",
  });
  logSuccess("Regenerated packages/design/tokens/styles.css");
}

// ─── end Phase 1 exports ──────────────────────────────────────────────────────

/**
 * Load brand config or use defaults
 */
async function loadConfig(): Promise<BrandConfig> {
  const configPath = path.join(ROOT, "brand.config.ts");

  if (!fs.existsSync(configPath)) {
    return DEFAULT_BRAND;
  }

  try {
    // Dynamic import of the config
    const configModule = await import(configPath);
    return configModule.default as BrandConfig;
  } catch (_error) {
    process.exit(1);
  }
}

/**
 * Replace all occurrences in a file
 */
function replaceInFile(filePath: string, replacements: Array<[string | RegExp, string]>): boolean {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  for (const [search, replace] of replacements) {
    const newContent = content.replace(search, replace);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
  }

  return modified;
}

/**
 * Copy custom assets if they exist
 */
function copyCustomAssets(_config: BrandConfig): void {
  logStep("Copying custom assets");

  const customAssetsDir = path.join(ROOT, "brand.config", "assets");
  // brand package moved under packages/design/ in the 2026-05 categorized layout.
  const targetAssetsDir = path.join(ROOT, "packages", "design", "brand", "assets");

  if (!fs.existsSync(customAssetsDir)) {
    logSkip("No custom assets found in brand.config/assets/");
    return;
  }

  // Copy logo files
  const logoDir = path.join(customAssetsDir, "logo");
  if (fs.existsSync(logoDir)) {
    const targetLogoDir = path.join(targetAssetsDir, "logo");
    const files = fs.readdirSync(logoDir);
    for (const file of files) {
      fs.copyFileSync(path.join(logoDir, file), path.join(targetLogoDir, file));
      logSuccess(`Copied logo/${file}`);
    }
  }

  // Copy favicon files
  const faviconDir = path.join(customAssetsDir, "favicon");
  if (fs.existsSync(faviconDir)) {
    const targetFaviconDir = path.join(targetAssetsDir, "favicon");
    const files = fs.readdirSync(faviconDir);
    for (const file of files) {
      fs.copyFileSync(path.join(faviconDir, file), path.join(targetFaviconDir, file));
      logSuccess(`Copied favicon/${file}`);
    }
  }
}

/**
 * Update packages/design/brand/src/metadata.ts
 */
function updateBrandMetadata(config: BrandConfig): void {
  logStep("Updating brand metadata");

  // brand package moved under packages/design/ in the 2026-05 categorized
  // layout — keep the path in sync with the actual workspace location.
  const metadataPath = path.join(ROOT, "packages", "design", "brand", "src", "metadata.ts");

  // Serialize a nested object literal as a TS `as const` block. We use
  // JSON.stringify for structural correctness then strip the outer-key
  // quotes so the output looks idiomatic; Biome runs after to handle
  // trailing commas / blank-line whitespace.
  const serialize = (value: unknown): string => {
    return JSON.stringify(value, null, 2);
  };

  const story = config.brand.story;
  const storyBlock = story
    ? `  story: {
    concept: ${JSON.stringify(story.concept)},
    colorMeaning: ${JSON.stringify(story.colorMeaning)},
    values: ${JSON.stringify(story.values)},
    missionStatement: ${JSON.stringify(story.missionStatement)},
  },\n\n`
    : "";

  const newContent = `/**
 * ${config.brand.name} Brand Metadata
 * Central source of truth for brand identity
 *
 * AUTO-GENERATED by \`pnpm brand:apply\` from \`scripts/brand-types.ts\`
 * (DEFAULT_BRAND) or a sibling \`brand.config.ts\` if present. Do NOT
 * edit by hand — your edits will be wiped on the next brand:apply.
 *
 * To rebrand, edit DEFAULT_BRAND in scripts/brand-types.ts and run
 * \`pnpm brand:apply\`. To extend the shape, add a field to BrandConfig,
 * set its value in DEFAULT_BRAND, then read it from this writer.
 *
 * Pipeline guard: tests/architecture/brand-metadata-drift.test.ts
 * asserts \`metadata.ts\` is byte-identical to what brand:apply emits.
 */

export const brand = {
  name: ${JSON.stringify(config.brand.name)},
  nameCn: ${JSON.stringify(config.brand.nameCn ?? config.brand.name)},
  nameFull: ${JSON.stringify(config.brand.nameFull ?? config.company.name)},
  nameFullEn: ${JSON.stringify(config.brand.nameFullEn ?? config.company.name)},

  tagline: ${JSON.stringify(config.brand.tagline)},
  taglineCn: ${JSON.stringify(config.brand.taglineCn ?? config.brand.tagline)},
  description: ${JSON.stringify(config.brand.description)},
  descriptionCn: ${JSON.stringify(config.brand.descriptionCn ?? config.brand.description)},

${storyBlock}  domains: ${serialize(config.domains)},

  social: ${serialize({
    twitter: config.social.twitter ?? "",
    github: config.social.github ?? "",
    discord: config.social.discord ?? "",
    linkedin: config.social.linkedin ?? "",
  })},
} as const;

/**
 * Brand Colors — full VI palette + brand gradients + semantic colors.
 * Aligned with @nebutra/design-tokens DTCG SSOT (tokens/core.json).
 */
export const colors = ${serialize(config.colors)} as const;

/**
 * Typography — "Precision Stack" (Geist + Noto Sans SC + Geist Mono).
 */
export const typography = ${serialize(config.typography)} as const;

/**
 * Logo asset paths (relative to package), dual-edition structure:
 *   - classic (v1.0): preferred for UX / product surfaces
 *   - compliant (v2.0): required for commercial / legal contexts
 */
export const logoAssets = ${serialize(config.logoAssets)} as const;

/**
 * Font asset paths (relative to package).
 */
export const fontAssets = ${serialize(config.fontAssets)} as const;

/**
 * Favicon assets.
 */
export const faviconAssets = ${serialize(config.faviconAssets)} as const;

/**
 * OG Image dimensions.
 */
export const ogImageDimensions = ${serialize(config.ogImageDimensions)} as const;

export type BrandColors = typeof colors;
export type BrandTypography = typeof typography;
export type LogoAssets = typeof logoAssets;
`;

  fs.writeFileSync(metadataPath, newContent, "utf-8");

  // JSON.stringify produces quoted object keys ("primary": instead of
  // primary:) and no trailing commas — Biome's strict mode rejects both.
  // Auto-fix the just-emitted file so brand:apply always lands a
  // lint-clean tree (otherwise `pnpm lint` in CI flags the generator's
  // own output, which kept CI red across runs 26079161015 → 26081453758).
  try {
    execFileSync(
      "pnpm",
      ["exec", "biome", "check", "--write", "--no-errors-on-unmatched", metadataPath],
      { cwd: ROOT, stdio: "pipe" },
    );
  } catch {
    // Biome exits non-zero when it can't auto-fix every diagnostic; the
    // file is still written with whatever fixes did apply, and the CI
    // lint job will surface anything that survived.
  }

  logSuccess("Updated packages/design/brand/src/metadata.ts");
}

/**
 * Update package.json files with new scope
 */
function updatePackageScopes(config: BrandConfig): void {
  logStep("Updating package scopes");

  const oldScope = "@nebutra";
  const newScope = config.packageScope;

  if (oldScope === newScope) {
    logSkip("Package scope unchanged");
    return;
  }

  // Find all package.json files
  const packagesDir = path.join(ROOT, "packages");
  const appsDir = path.join(ROOT, "apps");

  const packageDirs = [
    ...fs.readdirSync(packagesDir).map((d) => path.join(packagesDir, d)),
    ...fs.readdirSync(appsDir).map((d) => path.join(appsDir, d)),
  ];

  for (const dir of packageDirs) {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) continue;

    const content = fs.readFileSync(pkgPath, "utf-8");
    const newContent = content.replace(new RegExp(oldScope, "g"), newScope);

    if (content !== newContent) {
      fs.writeFileSync(pkgPath, newContent, "utf-8");
      logSuccess(`Updated ${path.relative(ROOT, pkgPath)}`);
    }
  }

  // Update root package.json
  const rootPkgPath = path.join(ROOT, "package.json");
  replaceInFile(rootPkgPath, [[new RegExp(oldScope, "g"), newScope]]);
}

/**
 * Update README files from templates
 */
function updateREADMEs(config: BrandConfig): void {
  logStep("Updating README files");

  const templates = [
    { template: "README.template.md", output: "README.md" },
    { template: "README.zh-CN.template.md", output: "README.zh-CN.md" },
    // Japanese was orphan-edited for ~6 months — wire it back into the
    // pipeline so future brand:apply runs keep all three READMEs aligned.
    { template: "README.ja.template.md", output: "README.ja.md" },
  ];

  for (const { template, output } of templates) {
    const templatePath = path.join(ROOT, template);
    const outputPath = path.join(ROOT, output);

    if (!fs.existsSync(templatePath)) {
      logSkip(`Template ${template} not found`);
      continue;
    }

    let content = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    const replacements: Record<string, string> = {
      "{{brand.name}}": config.brand.name,
      "{{brand.tagline}}": config.brand.tagline,
      "{{brand.description}}": config.brand.description,
      "{{company.name}}": config.company.name,
      "{{company.nameCN}}": config.company.nameCN || config.company.name,
      "{{company.email}}": config.company.email,
      "{{company.year}}": String(config.company.year),
      "{{domains.landing}}": config.domains.landing,
      "{{domains.app}}": config.domains.app,
      "{{domains.api}}": config.domains.api,
      "{{repo.owner}}": config.repo.owner,
      "{{repo.name}}": config.repo.name,
      "{{repo.full}}": `${config.repo.owner}/${config.repo.name}`,
      "{{social.twitter}}": config.social.twitter || "",
      "{{social.github}}": config.social.github || "",
      "{{social.discord}}": config.social.discord || "",
      "{{colors.primary.500}}": config.colors.primary[500],
      "{{colors.accent.500}}": config.colors.accent[500],
      "{{packageScope}}": config.packageScope,
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
    }

    // Handle vision pillars
    if (config.brand.vision?.pillars) {
      const visionList = config.brand.vision.pillars
        .map((p) => `- ${p.word}: ${p.meaning}`)
        .join("\n");
      content = content.replace("{{brand.vision}}", visionList);
    }

    // Handle license exemptions
    const exemptList = config.license.commercialExempt.join(", ");
    content = content.replace("{{license.commercialExempt}}", exemptList);

    fs.writeFileSync(outputPath, content, "utf-8");
    logSuccess(`Generated ${output}`);
  }
}

/**
 * Update environment variables template
 */
function updateEnvTemplate(config: BrandConfig): void {
  logStep("Updating .env.example");

  const envPath = path.join(ROOT, ".env.example");
  if (!fs.existsSync(envPath)) {
    logSkip(".env.example not found");
    return;
  }

  const replacements: Array<[RegExp, string]> = [
    [/NEXT_PUBLIC_APP_URL=.*/g, `NEXT_PUBLIC_APP_URL=https://${config.domains.app}`],
    [/NEXT_PUBLIC_API_URL=.*/g, `NEXT_PUBLIC_API_URL=https://${config.domains.api}`],
  ];

  if (replaceInFile(envPath, replacements)) {
    logSuccess("Updated .env.example");
  } else {
    logSkip("No changes needed");
  }
}

/**
 * Main
 */
async function main() {
  const releaseBrandApplyLock = acquireBrandApplyLock();

  try {
    const config = await loadConfig();

    // Apply changes
    copyCustomAssets(config);
    // Phase 5: generate favicon set from logo-inverse.svg after copyCustomAssets
    // has had a chance to copy operator-supplied SVGs into brand/assets/.
    const brandAssetsDir = path.join(ROOT, "packages", "design", "brand", "assets");
    logStep("Generating favicon set from logo-inverse.svg");
    await generateFavicons(brandAssetsDir);
    updateBrandMetadata(config);
    // Phase 1: derive + write core.json from DEFAULT_BRAND.colors, then
    // trigger the Style Dictionary build so styles.css regenerates.
    updateCoreJson(config);
    runDesignTokensBuild();
    updatePackageScopes(config);
    updateREADMEs(config);
    updateEnvTemplate(config);
  } finally {
    releaseBrandApplyLock();
  }
}

main().catch((e) => {
  process.stderr.write(`[brand:apply] Error: ${String(e)}\n`);
  process.exitCode = 1;
});
