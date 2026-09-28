#!/usr/bin/env node

// CI guard: no `next/font/google` in code the template ships.
//
// next/font/google downloads every face from fonts.googleapis.com /
// fonts.gstatic.com at build time AND in the dev server. A machine that cannot
// reach Google — mainland China (a primary market), a corporate proxy, an
// offline laptop — then fails `next build` ("Failed to fetch `Inter` from
// Google Fonts") and the Turbopack dev server answers 500 ("Can't resolve
// '@vercel/turbopack-next/internal/font/google/font'"). A scaffold's preview
// site was dead on arrival for exactly those customers.
//
// Load faces with next/font/local from an npm package instead — see
// packages/design/fonts/src/next.ts (@fontsource-variable/*, SIL OFL) — or add
// the face to @nebutra/fonts and use its CSS variable.
//
// Scope: every source file the template ships. Paths .templateignore strips
// (Nebutra-only apps such as apps/kuanlan and apps/typelens) are out of scope,
// so no allowlist is needed; in a scaffold there is no .templateignore and
// every file is in scope. packages/** is never stripped, so @nebutra/fonts is
// always checked.
//
// Run: node scripts/lint-no-google-fonts.mjs
// Exit 1 on any import / require / re-export of next/font/google.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_DIR = /(?:^|\/)(?:node_modules|\.next|dist|build|out|coverage|\.turbo|\.git)(?:\/|$)/;

// Any module specifier naming next/font/google (or the legacy @next/font/google):
// `import … from "…"` (single- or multi-line), `import "…"`, `import("…")`,
// `require("…")`, `export … from "…"`. Comments are NOT stripped: a commented
// import still fails, which is the safe direction.
const SPECIFIER =
  /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["'`](?:@next|next)\/font\/google(?:\/[^"'`]*)?["'`]/;

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\n")
    .filter(Boolean);
}

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = path.relative(ROOT, path.join(dir, entry.name)).split(path.sep).join("/");
    if (SKIP_DIR.test(rel)) continue;
    if (entry.isDirectory()) walk(path.join(dir, entry.name), out);
    else out.push(rel);
  }
}

// Tracked AND untracked (not git-ignored) files, so a new file fails before
// it is ever committed. Outside a git checkout, walk the tree.
let files;
let stripped = new Set();
try {
  files = git(["ls-files", "--cached", "--others", "--exclude-standard"]);
  if (existsSync(path.join(ROOT, ".templateignore"))) {
    stripped = new Set(
      git(["ls-files", "--cached", "--others", "--ignored", "--exclude-from=.templateignore"]),
    );
  }
} catch {
  files = [];
  walk(ROOT, files);
}

const violations = [];
let scanned = 0;
for (const file of files) {
  if (!SOURCE_EXT.test(file) || SKIP_DIR.test(file) || stripped.has(file)) continue;
  const abs = path.join(ROOT, file);
  if (!existsSync(abs) || !statSync(abs).isFile()) continue;
  scanned++;
  const text = readFileSync(abs, "utf8");
  if (!text.includes("font/google")) continue;
  const lines = text.split("\n");
  // Whole-file match first (a specifier can sit on a later line than `import`),
  // then report the line holding the specifier.
  const re = new RegExp(SPECIFIER.source, "g");
  for (const match of text.matchAll(re)) {
    const line = text.slice(0, match.index + match[0].length).split("\n").length;
    violations.push(`${file}:${line}: ${lines[line - 1].trim()}`);
  }
}

if (scanned === 0) {
  console.error("✗ lint-no-google-fonts: scanned no source files — the file list is wrong.");
  process.exit(1);
}

if (violations.length > 0) {
  console.error(
    `✗ next/font/google in template-shipped code (${violations.length}). It fetches from Google at build and dev time, so the app fails wherever Google is unreachable (mainland China, corporate networks, offline):`,
  );
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nLoad the face with next/font/local from an npm font package (see packages/design/fonts/src/next.ts), or use a @nebutra/fonts registry variable.",
  );
  process.exit(1);
}

console.log(
  `✓ lint-no-google-fonts: ${scanned} template-shipped source files, no next/font/google.`,
);
