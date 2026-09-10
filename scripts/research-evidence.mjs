#!/usr/bin/env node
import { statSync } from "node:fs";
/**
 * Convert a raw research capture into committed evidence:
 *   node scripts/research-evidence.mjs <in.png> <out.webp> [--max-kb 150]
 * Resizes to ≤1440px wide and lowers webp quality until the file fits the budget.
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/forge/package.json"));
const sharp = require("sharp");
const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: research-evidence.mjs <in.png> <out.webp> [--max-kb N]");
  process.exit(2);
}
const i = rest.indexOf("--max-kb");
const maxKb = i >= 0 ? Number(rest[i + 1]) : 150;
for (const q of [82, 72, 62, 52, 42, 32]) {
  await sharp(input)
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: q })
    .toFile(output);
  const kb = statSync(output).size / 1024;
  if (kb <= maxKb) {
    console.log(`${output} ${kb.toFixed(0)}KB q${q}`);
    process.exit(0);
  }
}
console.error(`could not fit ${output} under ${maxKb}KB`);
process.exit(1);
