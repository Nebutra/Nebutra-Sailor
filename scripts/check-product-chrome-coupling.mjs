#!/usr/bin/env node
/**
 * Local audit: product chrome hard-coupled to blue scale / VI hex.
 * Not a CI gate — run when changing design consumption.
 *
 *   node scripts/check-product-chrome-coupling.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const targets = [
  "apps/web/src",
  "apps/forge/src",
  "apps/router/src",
  "apps/auth/src",
  "apps/idp/src",
];
const skipDir = new Set([
  "node_modules",
  "__tests__",
  "stories",
  "theme-playground",
  "dist",
  ".next",
]);
const pattern =
  /\b(bg-blue-\d+|text-blue-\d+|border-blue-\d+|ring-blue-\d+|from-blue-\d+|to-blue-\d+|bg-blue-\d{3}|text-blue-\d{3}|border-blue-\d{3}|#0033[Ff][Ee]|#0[Bb][Ff]1[Cc]3)\b|var\(--blue-\d+\)|rgba\(59,\s*130,\s*246/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (skipDir.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p);
  }
  return out;
}

const hits = [];
for (const t of targets) {
  const abs = join(root, t);
  for (const file of walk(abs)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (pattern.test(line)) {
        pattern.lastIndex = 0;
        hits.push(`${relative(root, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
      pattern.lastIndex = 0;
    });
  }
}

if (hits.length === 0) {
  console.log("OK — no blue-scale / VI-hex product chrome hits in scanned apps.");
  process.exit(0);
}

console.log(`Found ${hits.length} hard-coupling hit(s):\n`);
for (const h of hits.slice(0, 80)) console.log(h);
if (hits.length > 80) console.log(`… +${hits.length - 80} more`);
process.exit(1);
