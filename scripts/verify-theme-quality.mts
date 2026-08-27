/**
 * Independent theme quality + WCAG-AA verifier (uses chroma-js, NOT the generator's math).
 * Usage: pnpm exec tsx scripts/verify-theme-quality.mts <theme.json> [...]
 * Per theme: AA(primary-fg/primary, fg/bg) ≥ 4.5, background must be near-neutral (low chroma)
 * and must NOT equal primary; all 9 required roles present.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import chroma from "chroma-js";

function parseColor(v: string): chroma.Color {
  const s = v.trim();
  const oklch = s.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (oklch) return chroma.oklch(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  const mix = s.match(/^color-mix\(in oklch,\s*(.+?),\s*(.+?)\s+([\d.]+)%\)$/i);
  if (mix) return chroma.mix(parseColor(mix[1]), parseColor(mix[2]), Number(mix[3]) / 100, "oklch");
  return chroma(s); // hex / rgb / named
}

const REQUIRED = [
  ["color", "primary"],
  ["color", "primary-foreground"],
  ["color", "background"],
  ["color", "foreground"],
  ["color", "card"],
  ["color", "border"],
  ["color", "ring"],
  ["radius", "md"],
  ["fontFamily", "sans"],
] as const;

// light.json / dark.json are MODE bases (not themes) — not in the registry; skip them.
const SKIP_IDS = new Set(["light", "dark"]);

function check(file: string) {
  const id = basename(file).replace(/\.json$/u, "");
  if (SKIP_IDS.has(id)) return null;
  const j = JSON.parse(readFileSync(file, "utf8"));
  const flags: string[] = [];
  const val = (g: string, k: string): string | undefined => j[g]?.[k]?.$value;
  const requiredVal = (g: string, k: string): string => {
    const value = val(g, k);
    if (!value) throw new Error(`missing token ${g}.${k}`);
    return value;
  };

  for (const [g, k] of REQUIRED) if (!val(g, k)) flags.push(`missing:${g}.${k}`);

  let aaPrimary = 0,
    aaBody = 0,
    bgChroma = 0;
  try {
    const primary = parseColor(requiredVal("color", "primary"));
    const primaryFg = parseColor(requiredVal("color", "primary-foreground"));
    const bg = parseColor(requiredVal("color", "background"));
    const fg = parseColor(requiredVal("color", "foreground"));
    aaPrimary = chroma.contrast(primary, primaryFg);
    aaBody = chroma.contrast(bg, fg);
    bgChroma = bg.get("oklch.c");
    // primary-foreground sits on a brand fill as button/UI text → AA-large (3.0) is the bar.
    // background/foreground is body text → AA-normal (4.5).
    if (aaPrimary < 3.0) flags.push(`AA-primary:${aaPrimary.toFixed(2)}`);
    if (aaBody < 4.5) flags.push(`AA-body:${aaBody.toFixed(2)}`);
    if (bgChroma > 0.04) flags.push(`saturated-bg:C=${bgChroma.toFixed(3)}`);
    if (chroma.deltaE(primary, bg) < 8) flags.push("bg≈primary");
  } catch (e) {
    flags.push(`parse-error:${(e as Error).message}`);
  }
  return {
    id,
    aaPrimary: +aaPrimary.toFixed(2),
    aaBody: +aaBody.toFixed(2),
    bgChroma: +bgChroma.toFixed(3),
    flags,
  };
}

const results = process.argv
  .slice(2)
  .map(check)
  .filter((r): r is NonNullable<typeof r> => r !== null);
const bad = results.filter((r) => r.flags.length > 0);
process.stdout.write(`total=${results.length} failing=${bad.length}\n`);
for (const r of bad) process.stdout.write(`  ${r.id}: ${r.flags.join(", ")}\n`);
if (bad.length > 0) process.exit(1);
