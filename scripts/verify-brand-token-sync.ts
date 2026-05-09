#!/usr/bin/env tsx

/**
 * Token sync verification — CI guardrail.
 *
 * SSOT: `@nebutra/design-tokens/tokens/*.json` (W3C DTCG).
 * Mirror layers: `@nebutra/brand` (`metadata.ts`, `guidelines/color.ts`),
 *                `@nebutra/tokens/styles.css`,
 *                `@nebutra/theme/themes.css`,
 *                `@nebutra/ui` (`primitive.ts`, `tailwind.preset.ts`).
 *
 * This script enforces that every mirror agrees with the SSOT for the
 * tokens identified by the audit (docs/design-system/token-drift-audit.md).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  nebutraBlueScale,
  nebutraCyanScale,
  nebutraNeutralScale,
} from "../packages/brand/src/guidelines/color.ts";
import { colors, typography } from "../packages/brand/src/metadata.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

interface CheckFailure {
  check: string;
  detail: string;
}

const failures: CheckFailure[] = [];

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(read(relativePath)) as T;
}

function fail(check: string, detail: string): void {
  failures.push({ check, detail });
}

function ok(label: string): void {
  process.stdout.write(`  ✓ ${label}\n`);
}

interface DtcgLeaf {
  $value: string;
  $type?: string;
  $extensions?: Record<string, unknown>;
}
interface DtcgCore {
  color: {
    "nebutra-blue": Record<string, DtcgLeaf>;
    "nebutra-cyan": Record<string, DtcgLeaf>;
    "nebutra-neutral": Record<string, DtcgLeaf>;
    status: { success: DtcgLeaf; warning: DtcgLeaf; danger: DtcgLeaf };
  };
  fontFamily: {
    sans: DtcgLeaf;
    mono: DtcgLeaf;
    cn: DtcgLeaf;
  };
}

const core = readJson<DtcgCore>("packages/design-tokens/tokens/core.json");

const tokensCss = read("packages/tokens/styles.css");
const themesCss = read("packages/theme/themes.css");
const primitiveTs = read("packages/ui/src/tokens/primitive.ts");

process.stdout.write("Verifying brand token sync against @nebutra/design-tokens SSOT...\n\n");

// ─── 1. Brand primary/accent base colors ────────────────────────────────────
{
  const ssotPrimary = core.color["nebutra-blue"]["500"].$value.toLowerCase();
  const ssotAccent = core.color["nebutra-cyan"]["500"].$value.toLowerCase();
  if (colors.primary[500].toLowerCase() !== ssotPrimary) {
    fail("brand.primary[500]", `metadata.ts ${colors.primary[500]} ≠ SSOT ${ssotPrimary}`);
  } else {
    ok(`brand.primary[500] === ${ssotPrimary}`);
  }
  if (colors.accent[500].toLowerCase() !== ssotAccent) {
    fail("brand.accent[500]", `metadata.ts ${colors.accent[500]} ≠ SSOT ${ssotAccent}`);
  } else {
    ok(`brand.accent[500] === ${ssotAccent}`);
  }
}

// ─── 2. Full primary/accent scale parity (metadata.ts vs DTCG SSOT) ────────
{
  const STEPS = [
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
  let primaryDrift = 0;
  let accentDrift = 0;
  for (const step of STEPS) {
    const ssot = core.color["nebutra-blue"][step].$value.toLowerCase();
    const meta = colors.primary[Number(step) as keyof typeof colors.primary]?.toLowerCase();
    if (meta !== ssot) {
      primaryDrift += 1;
      fail(`brand.primary[${step}]`, `metadata.ts ${meta} ≠ SSOT ${ssot}`);
    }
    const ssotAccent = core.color["nebutra-cyan"][step].$value.toLowerCase();
    const metaAccent = colors.accent[Number(step) as keyof typeof colors.accent]?.toLowerCase();
    if (metaAccent !== ssotAccent) {
      accentDrift += 1;
      fail(`brand.accent[${step}]`, `metadata.ts ${metaAccent} ≠ SSOT ${ssotAccent}`);
    }
  }
  if (primaryDrift === 0) ok("primary scale (50–950) — all 11 steps match SSOT");
  if (accentDrift === 0) ok("accent scale (50–950) — all 11 steps match SSOT");
}

// ─── 3. Neutral family (Slate, not Zinc) ────────────────────────────────────
{
  const ssotNeutral50 = core.color["nebutra-neutral"]["50"].$value.toLowerCase();
  const expectedSlate50 = "#f8fafc";
  if (colors.neutral[50]?.toLowerCase() !== ssotNeutral50) {
    fail("brand.neutral[50]", `metadata.ts ${colors.neutral[50]} ≠ SSOT ${ssotNeutral50}`);
  } else if (ssotNeutral50 !== expectedSlate50) {
    fail("brand.neutral[50]", `SSOT is ${ssotNeutral50} but Slate-50 should be ${expectedSlate50}`);
  } else {
    ok("brand.neutral family is Slate (not Zinc)");
  }

  // Verify nebutraNeutralScale (guidelines/color.ts re-export) also aligns.
  if (nebutraNeutralScale[50] !== colors.neutral[50]) {
    fail(
      "guidelines.neutral re-export",
      "nebutraNeutralScale must redirect to colors.neutral (metadata.ts)",
    );
  } else {
    ok("guidelines/color.ts: nebutraNeutralScale → colors.neutral (Slate)");
  }
}

// ─── 4. Guidelines re-exports collapse drift ────────────────────────────────
{
  if (nebutraBlueScale[500] !== colors.primary[500]) {
    fail("guidelines.blue re-export", "nebutraBlueScale must redirect to colors.primary");
  } else {
    ok("guidelines/color.ts: nebutraBlueScale → colors.primary");
  }
  if (nebutraCyanScale[500] !== colors.accent[500]) {
    fail("guidelines.cyan re-export", "nebutraCyanScale must redirect to colors.accent");
  } else {
    ok("guidelines/color.ts: nebutraCyanScale → colors.accent");
  }
}

// ─── 5. Font stack — Geist + CJK fallbacks ──────────────────────────────────
{
  const ssotSans = core.fontFamily.sans.$value;
  const expectedFonts = ["Geist", "Noto Sans SC", "PingFang SC", "Microsoft YaHei"];
  for (const font of expectedFonts) {
    if (!ssotSans.includes(font)) {
      fail("fontFamily.sans (SSOT)", `SSOT sans missing required font "${font}"`);
    }
  }

  if (!typography.fontFamily.sans.includes("Geist")) {
    fail(
      "metadata.fontFamily.sans",
      `metadata.ts sans must include "Geist", got: ${typography.fontFamily.sans}`,
    );
  } else {
    ok("metadata.ts: typography.fontFamily.sans includes Geist");
  }

  if (typography.fontFamily.sans.includes("Poppins")) {
    fail("metadata.fontFamily.sans", "metadata.ts sans still references Poppins");
  } else {
    ok("metadata.ts: Poppins removed from sans stack");
  }

  if (!primitiveTs.includes('"Geist"') || primitiveTs.includes('"Poppins"')) {
    fail("ui.primitive.fontFamily", "primitive.ts must use Geist and must NOT use Poppins");
  } else {
    ok("ui/primitive.ts: Geist primary, Poppins removed");
  }

  if (!tokensCss.includes("Geist") || tokensCss.includes("Poppins")) {
    fail("tokens/styles.css fontFamily", "styles.css must use Geist and must NOT use Poppins");
  } else {
    ok("tokens/styles.css: Geist primary, Poppins removed");
  }
}

// ─── 6. Success color — #22c55e (not #10b981 emerald) ───────────────────────
{
  const ssotSuccess = core.color.status.success.$value.toLowerCase();
  if (ssotSuccess !== "#22c55e") {
    fail("status.success (SSOT)", `SSOT should be #22c55e, got ${ssotSuccess}`);
  }
  if (!tokensCss.toLowerCase().includes("--status-success: #22c55e")) {
    fail("tokens/styles.css --status-success", "must be #22c55e (not #10b981)");
  } else {
    ok("tokens/styles.css: --status-success === #22c55e");
  }
  if (colors.success.toLowerCase() !== "#22c55e") {
    fail("metadata.success", `metadata.ts colors.success ${colors.success} ≠ #22c55e`);
  } else {
    ok("metadata.ts: colors.success === #22c55e");
  }
}

// ─── 7. Brand gradient names — both --brand-gradient and --gradient-brand exist ───
{
  if (!tokensCss.includes("--brand-gradient:")) {
    fail("tokens/styles.css --brand-gradient", "Canonical --brand-gradient must exist");
  } else {
    ok("tokens/styles.css: --brand-gradient exists (canonical)");
  }
  if (!tokensCss.includes("--gradient-brand:")) {
    fail("tokens/styles.css --gradient-brand", "Backward-compat --gradient-brand alias must exist");
  } else {
    ok("tokens/styles.css: --gradient-brand alias exists (backward compat)");
  }
}

// ─── 8. P3 wide-gamut overrides + oklch overrides present ───────────────────
{
  if (!tokensCss.includes("@supports (color: color(display-p3")) {
    fail("tokens/styles.css P3 support", "Display-P3 @supports block missing");
  } else {
    ok("tokens/styles.css: @supports (display-p3) wrapper present");
  }
  if (!tokensCss.includes("@supports (color: oklch(0 0 0))")) {
    fail("tokens/styles.css oklch support", "oklch fallback @supports block missing");
  } else {
    ok("tokens/styles.css: @supports (oklch) wrapper present");
  }
}

// ─── 9. Theme CSS structural checks ─────────────────────────────────────────
{
  if (!themesCss.includes("@theme")) {
    fail("themes.css", "Missing Tailwind v4 @theme block");
  } else {
    ok("themes.css: @theme block present");
  }
  if (!themesCss.includes("--color-primary")) {
    fail("themes.css", "Missing --color-primary");
  } else {
    ok("themes.css: --color-primary present");
  }
  for (const themeName of ["gradient", "dark-dense", "minimal", "vibrant", "ocean"]) {
    const selector = `[data-theme="${themeName}"]`;
    if (!themesCss.includes(selector)) {
      fail("themes.css multi-theme", `Missing ${selector}`);
    }
  }
  if (!themesCss.includes("@theme inline")) {
    fail("themes.css @theme inline", "Missing keyframe @theme inline block");
  } else {
    ok("themes.css: @theme inline (keyframes) present");
  }
}

// ─── 10. --brand-gradient single source of truth (no duplicate definition) ───
{
  // Generated CSS emits --brand-gradient once per selector scope (:root, .dark).
  // We expect at most 2 direct linear-gradient definitions (one per scope).
  const directMatches = [...tokensCss.matchAll(/--brand-gradient:\s*linear-gradient/g)];
  if (directMatches.length > 2) {
    fail(
      "tokens/styles.css --brand-gradient",
      `Found ${directMatches.length} direct linear-gradient definitions; expected ≤ 2 (one per :root/.dark)`,
    );
  } else {
    ok(
      `tokens/styles.css: --brand-gradient direct definitions = ${directMatches.length} (one per scope)`,
    );
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────
process.stdout.write("\n");
if (failures.length === 0) {
  process.stdout.write(
    "✓ Token sync verification passed — all mirrors agree with @nebutra/design-tokens SSOT.\n",
  );
  process.exit(0);
} else {
  process.stderr.write(
    `✗ Token sync verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):\n\n`,
  );
  for (const { check, detail } of failures) {
    process.stderr.write(`  • ${check}\n    ${detail}\n`);
  }
  process.exit(1);
}
