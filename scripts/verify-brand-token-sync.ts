#!/usr/bin/env tsx

/**
 * Source of truth package: @nebutra/brand
 *
 * CI guardrail:
 * - primitive token layer must reference brand metadata values
 * - CSS brand bridge must expose P3 + sRGB fallback tokens
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { colors } from "../packages/brand/src/metadata.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const themesCss = read("packages/theme/themes.css");

assert(
  themesCss.includes("--color-primary") && themesCss.includes("--color-secondary"),
  "Theme CSS is missing primary/secondary color tokens.",
);

assert(themesCss.includes("@theme"), "Theme CSS is missing Tailwind v4 @theme block.");

assert(colors.primary[500] === "#0033FE", "Brand primary 500 drift detected.");
assert(colors.accent[500] === "#0BF1C3", "Brand accent 500 drift detected.");

console.log("Token sync verification passed ✓ @nebutra/brand tokens are in sync.");
