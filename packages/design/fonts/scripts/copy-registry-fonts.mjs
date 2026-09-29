#!/usr/bin/env node
/**
 * copy-registry-fonts.mjs — vendor the 19 registry faces' woff2 files into
 * this package, so `../generated/registry/<file>` (the path src/next.ts
 * passes to `next/font/local`) resolves regardless of how the package ends
 * up installed downstream.
 *
 * WHY THIS EXISTS
 * `next/font/local` is a compile-time SWC transform: its `path` must be a
 * string literal resolved relative to the file that calls it — there is no
 * way to resolve it dynamically at runtime (see the comment atop src/next.ts).
 * The faces used to point at `../node_modules/@fontsource-variable/<name>/
 * files/<file>`, which only exists because pnpm nests every workspace
 * package's own dependencies under its own node_modules. A published,
 * hoisted `npm install` of @nebutra/fonts commonly resolves
 * `@fontsource-variable/*` to the installing project's top-level
 * node_modules instead, so that relative path did not exist and
 * `next build` failed to resolve the font file.
 *
 * Copying the actual bytes into the package itself (committed to git, same
 * as generated/dm-sans.woff2) removes the dependency on where npm/pnpm/yarn
 * decided to place @fontsource-variable/* — the file is always right next to
 * the module that references it.
 *
 * Idempotent and cheap (byte-for-byte copies, no subsetting): safe to run on
 * every `build` and on `prepack` as a last line of defense before publish.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(PKG_DIR, "generated", "registry");

/**
 * Keep in sync with the `localFont` calls in src/next.ts — one entry per
 * registry face, `pkg` the @fontsource-variable/* package name and `file`
 * the Latin/upright/variable woff2 it publishes under `files/`.
 */
const FACES = [
  "inter",
  "inter-tight",
  "space-grotesk",
  "playfair-display",
  "fraunces",
  "jetbrains-mono",
  "manrope",
  "sora",
  "work-sans",
  "dm-sans",
  "plus-jakarta-sans",
  "outfit",
  "figtree",
  "montserrat",
  "lexend",
  "fira-code",
  "roboto-mono",
  "source-serif-4",
  "source-code-pro",
].map((pkg) => ({ pkg, file: `${pkg}-latin-wght-normal.woff2` }));

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let copied = 0;
  let upToDate = 0;
  for (const { pkg, file } of FACES) {
    const source = require.resolve(`@fontsource-variable/${pkg}/files/${file}`);
    const dest = join(OUT_DIR, file);
    if (existsSync(dest) && statSync(dest).size === statSync(source).size) {
      upToDate++;
      continue;
    }
    copyFileSync(source, dest);
    copied++;
  }
  process.stdout.write(
    `[fonts] registry woff2: ${copied} copied, ${upToDate} up to date (${FACES.length} total) → ${OUT_DIR}\n`,
  );
}

main();
