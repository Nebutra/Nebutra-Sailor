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
// The taxonomy-rename redirect table (previously Next `redirects()`, which
// `output: "export"` cannot run at all) is reproduced below as a real
// Cloudflare Workers static-assets `_redirects` file — see `writeRedirects`.
//
// The `<slug>.mdx` content-negotiation shortcut (previously Next
// `rewrites()`) is NOT reproduced: Workers static-assets `_redirects` follows
// the Netlify `_redirects` spec, whose `*` splat may only appear as a whole
// trailing path segment (`/old/*  /new/:splat`) — it cannot strip a `.mdx`
// suffix off the middle of a segment (`installation.mdx` is one segment, not
// `installation` plus a separately-matchable tail), so a rule like
// `/*.mdx  /llms.mdx/docs/:splat` is not expressible here, and a
// plausible-looking-but-wrong rule that silently no-ops on every request is
// worse than an honest gap. The canonical, non-shortcut path still works:
// `/llms.mdx/docs/<lang>/<slug>` for raw Markdown.

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
import { TAXONOMY_REDIRECTS } from "./taxonomy-redirects.mjs";

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

/**
 * `TAXONOMY_REDIRECTS` entries are in the zone's PUBLIC shape (no `/docs`
 * prefix — see taxonomy-redirects.mjs's own header comment). Workers static
 * assets serve this deploy AS the `/docs` zone (this Worker has no route of
 * its own; landing forwards `/docs/*` here byte for byte — see
 * wrangler.jsonc), so every source and destination here needs that prefix
 * added back for the rule to match what a real request's path looks like.
 *
 * `_redirects` follows the Netlify spec: one rule per line,
 * `<source> <destination> <status>`, checked top to bottom, first match
 * wins. 301 (not the framework-default 308) matches what this table's
 * former Next `redirects({ permanent: true })` actually sent.
 */
export function redirectsFileContents() {
  const lines = TAXONOMY_REDIRECTS.map(
    ({ source, destination }) => `/docs${source}  /docs${destination}  301`,
  );
  return `${lines.join("\n")}\n`;
}

function writeRedirects(dir) {
  const contents = redirectsFileContents();
  writeFileSync(join(dir, "_redirects"), contents);
  return TAXONOMY_REDIRECTS.length;
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

  // 4. `_redirects` lives at the assets root (`wrangler.jsonc`'s
  // `assets.directory`), not nested under `docs/` — Workers static assets
  // reads it from the root of the directory it serves, and it must contain
  // the full public path (`/docs/...`) on both sides since nothing else adds
  // that prefix at request time in this deploy.
  const redirectCount = writeRedirects(distDir);

  // biome-ignore lint/suspicious/noConsole: build script - stdout is expected.
  console.log(
    `postbuild-static-export: wrote ${distDocsDir} (assets root: ${distDir}), ${redirectCount} redirect rule(s) in _redirects`,
  );
}

// Only run when executed directly (`node scripts/postbuild-static-export.mjs`),
// not when imported by a test for `redirectsFileContents()`.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
