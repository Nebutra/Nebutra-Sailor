#!/usr/bin/env node
// Turns `next build`'s `output: "export"` output (`out/`) into the tree
// Cloudflare Workers static assets should actually serve (`dist/docs/**`).
//
// Two things the removed Edge Middleware (src/middleware.ts, deleted with
// this migration) used to do per-request now have to happen as real file
// moves, because a static deploy has no server left to do them at request
// time:
//
//  1. `i18n.hideLocale: "default-locale"` (src/lib/i18n.ts) keeps the
//     default language ("en") out of every URL: `/getting-started/
//     installation`, not `/en/getting-started/installation`. `next build`
//     still writes English pages under an `en/` directory (there is no
//     "no-prefix" route in the App Router tree — `[lang]` is always present
//     — src/app/[lang]/layout.tsx), so this script folds `out/en/**` up to
//     `out/**`.
//  2. The bare zone root (`/`, which is `/docs` once mounted under
//     basePath) had no page of its own — src/lib/docs-fallback.ts's
//     `rootFallbackFor` serves the "getting-started/installation" content
//     in its place. `generateStaticParams` in
//     src/app/[lang]/[[...slug]]/page.tsx now includes that empty-slug case
//     per language so `next build` actually renders it (`out/en.html`,
//     `out/zh.html`); this script gives each a real `index.html` in the
//     shape every other page already has.
//
// Then the whole tree is nested under `docs/`, matching this zone's
// `basePath` (next.config.ts) — `next build` does not do this on its own;
// `basePath` only rewrites the URLs the app itself emits, not where its own
// output lands on disk.
//
// Known gaps, intentionally out of scope for this pass (see the PR/commit
// this shipped in): the `<slug>.mdx` content-negotiation shortcut and the
// taxonomy-rename redirect table (both used Next `rewrites()`/`redirects()`,
// which `output: "export"` cannot run) are not reproduced as static files
// here. The canonical, non-shortcut paths both features aliased still work:
// `/llms.mdx/docs/<lang>/<slug>` for raw Markdown, and the renamed page
// itself for anyone who lands on the new URL directly.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(appRoot, "out");
const distDir = join(appRoot, "dist");
const distDocsDir = join(distDir, "docs");

// Kept in sync by hand with src/lib/i18n.ts (`defaultLanguage`,
// `languages`) — this script runs after the Next.js build, on plain
// filesystem paths, not through the app's module graph, so it can't import
// that file directly without pulling in a TS loader for one constant.
const DEFAULT_LANGUAGE = "en";
const OTHER_LANGUAGES = ["zh"];

function assertExists(path, what) {
  if (!existsSync(path)) {
    console.error(
      `postbuild-static-export: expected ${what} at ${path} — did the export build change shape?`,
    );
    process.exit(1);
  }
}

function main() {
  assertExists(outDir, "the static export output (out/)");

  // 1. Fold the default language up to the zone root.
  for (const ext of ["html", "txt"]) {
    const src = join(outDir, `${DEFAULT_LANGUAGE}.${ext}`);
    if (existsSync(src)) renameSync(src, join(outDir, `index.${ext}`));
  }
  const defaultLangDir = join(outDir, DEFAULT_LANGUAGE);
  if (existsSync(defaultLangDir)) {
    cpSync(defaultLangDir, outDir, { recursive: true });
    rmSync(defaultLangDir, { recursive: true, force: true });
  }

  // 2. Give every other language's root file (`out/zh.html`) a home inside
  // its own language directory, in the same `<dir>/index.html` shape every
  // other page in that tree already has.
  for (const lang of OTHER_LANGUAGES) {
    const langDir = join(outDir, lang);
    for (const ext of ["html", "txt"]) {
      const src = join(outDir, `${lang}.${ext}`);
      if (existsSync(src)) {
        mkdirSync(langDir, { recursive: true });
        renameSync(src, join(langDir, `index.${ext}`));
      }
    }
  }

  assertExists(join(outDir, "getting-started", "installation.html"), "the folded English tree");
  assertExists(join(outDir, "zh", "index.html"), "the zh zone root");
  assertExists(join(outDir, "index.html"), "the folded zone root");

  // 3. Nest under docs/, matching next.config.ts's basePath. This is a
  // Workers static-assets deploy with no route bound to a hostname
  // (wrangler.jsonc) — landing forwards `<site>/docs/*` here unchanged, so
  // this Worker's own workers.dev URL must itself serve the site at /docs.
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDocsDir, { recursive: true });
  cpSync(outDir, distDocsDir, { recursive: true });

  // A top-level 404 as well as the nested one: `not_found_handling:
  // "404-page"` in wrangler.jsonc has not been verified to walk up from a
  // sub-path to find one, so both are provided defensively.
  const notFoundHtml = join(distDocsDir, "404.html");
  if (existsSync(notFoundHtml)) {
    writeFileSync(join(distDir, "404.html"), readFileSync(notFoundHtml));
  }

  // biome-ignore lint/suspicious/noConsole: build script - stdout is expected.
  console.log(`postbuild-static-export: wrote ${distDocsDir} (assets root: ${distDir})`);
}

main();
