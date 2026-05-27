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
} from "../packages/design/brand/src/guidelines/color.ts";
import { colors, typography } from "../packages/design/brand/src/metadata.ts";

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
interface DtcgSemantic {
  brand: {
    gradient: {
      start: DtcgLeaf;
      end: DtcgLeaf;
      primary: DtcgLeaf;
    };
  };
}

const core = readJson<DtcgCore>("packages/design/design-tokens/tokens/core.json");
const semantic = readJson<DtcgSemantic>("packages/design/design-tokens/tokens/semantic.json");

const tokensCss = read("packages/design/tokens/styles.css");
const themesCss = read("packages/design/theme/themes.css");
const primitiveTs = read("packages/design/ui/src/tokens/primitive.ts");

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/iu.exec(hex.trim());
  if (!match) throw new Error(`Expected 6-digit hex color, got "${hex}"`);
  const value = match[1];
  if (!value) throw new Error(`Expected 6-digit hex color, got "${hex}"`);
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHsl(hex: string): { hue: number; lightness: number } {
  const [rRaw, gRaw, bRaw] = hexToRgb(hex);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = ((max + min) / 2) * 100;

  if (delta === 0) return { hue: 0, lightness };

  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, lightness };
}

function extractHexStops(gradient: string): string[] {
  return [...gradient.matchAll(/#[0-9a-f]{6}\b/giu)].map((match) => match[0].toLowerCase());
}

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

// ─── 8. Brand action gradient — contrast-safe and visually clean ────────────
{
  const actionGradient = semantic.brand.gradient.primary.$value.toLowerCase();
  const stops = extractHexStops(actionGradient);
  if (stops.length < 2) {
    fail(
      "semantic.brand.gradient.primary",
      `Expected at least two explicit hex stops, got: ${semantic.brand.gradient.primary.$value}`,
    );
  }

  const start = semantic.brand.gradient.start.$value.toLowerCase();
  const end = semantic.brand.gradient.end.$value.toLowerCase();
  const firstStop = stops[0];
  const finalStop = stops.at(-1);

  if (firstStop !== start || finalStop !== end) {
    fail(
      "semantic.brand.gradient start/end",
      `primary gradient stops ${firstStop ?? "missing"} → ${finalStop ?? "missing"} must match start/end tokens ${start} → ${end}`,
    );
  } else {
    ok(`semantic.brand.gradient start/end === ${start} → ${end}`);
  }

  for (const stop of stops) {
    const ratio = contrastRatio(stop, "#ffffff");
    if (ratio < 4.5) {
      fail(
        `semantic.brand.gradient stop ${stop}`,
        `White text contrast is ${ratio.toFixed(2)}:1; compact CTA stops must stay ≥ 4.5:1`,
      );
    }
  }
  if (stops.length > 0) {
    ok("semantic.brand.gradient: every stop preserves white-text contrast ≥ 4.5:1");
  }

  const endTone = rgbToHsl(end);
  if (endTone.hue < 185 || endTone.hue > 205) {
    fail(
      "semantic.brand.gradient.end hue",
      `Expected a cyan-blue end stop (185–205deg), got ${endTone.hue.toFixed(1)}deg for ${end}`,
    );
  } else {
    ok(`semantic.brand.gradient.end hue is cyan-blue (${endTone.hue.toFixed(1)}deg)`);
  }

  if (endTone.lightness < 30) {
    fail(
      "semantic.brand.gradient.end lightness",
      `End stop ${end} is too dark (${endTone.lightness.toFixed(1)}%); action gradients must not collapse into muddy emerald.`,
    );
  } else {
    ok(`semantic.brand.gradient.end lightness is usable (${endTone.lightness.toFixed(1)}%)`);
  }

  if (!tokensCss.toLowerCase().includes(actionGradient)) {
    fail("tokens/styles.css --brand-gradient", "runtime CSS must contain the DTCG action gradient");
  } else {
    ok("tokens/styles.css: --brand-gradient mirrors DTCG action gradient");
  }

  if (tokensCss.toLowerCase().includes("linear-gradient(135deg, #254bfa 0%, #057963 100%)")) {
    fail(
      "tokens/styles.css --brand-gradient",
      "Old dark green action gradient is still present as a direct UI gradient",
    );
  }
}

// ─── 9. P3 wide-gamut overrides + oklch overrides present ───────────────────
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

// ─── 10. Theme CSS structural checks ────────────────────────────────────────
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

// ─── 11. --brand-gradient single source of truth (no duplicate definition) ───
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
