#!/usr/bin/env node
/**
 * Copies the three core Latin faces next to fonts.css, the @font-face path for
 * hosts without next/font (Storybook, Vite apps). Committed, like
 * @nebutra/fonts/generated, so the url() in fonts.css is package-relative and
 * resolves no matter how a package manager lays out node_modules.
 *
 *   Geist / Geist Mono — the `geist` package (SIL OFL 1.1)
 *   DM Sans            — @nebutra/fonts/generated/dm-sans.woff2 (SIL OFL 1.1)
 *
 * The Next path (@nebutra/tokens/fonts) loads the very same files through
 * next/font, so a Storybook story and the app render one face.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(packageRoot, "fonts");
mkdirSync(out, { recursive: true });

// geist's exports map hides package.json; resolve the package dir by walking up
// from node_modules instead.
const geistRoot =
  [
    join(packageRoot, "node_modules", "geist"),
    resolve(packageRoot, "..", "..", "..", "node_modules", "geist"),
  ].find((p) => existsSync(p)) ?? "";
const fontsRoot = resolve(packageRoot, "..", "fonts");

const files = [
  [join(geistRoot, "dist/fonts/geist-sans/Geist-Variable.woff2"), "geist-sans-variable.woff2"],
  [join(geistRoot, "dist/fonts/geist-mono/GeistMono-Variable.woff2"), "geist-mono-variable.woff2"],
  [join(fontsRoot, "generated/dm-sans.woff2"), "dm-sans-variable.woff2"],
];

for (const [from, name] of files) {
  if (!existsSync(from)) {
    // A standalone mirror without the sources keeps the committed copies.
    console.warn(`[tokens] copy-fonts: ${from} missing, keeping committed fonts/${name}`);
    continue;
  }
  copyFileSync(from, join(out, name));
}
