#!/usr/bin/env node
/**
 * Turns Next's static export (out/) into the tree the KCQ nginx serves next to the product
 * (dist/ is copied into the same html root as apps/kcq/dist by deploy-kcq-fly.yml):
 *
 *   dist/docs.html, dist/docs/**        English
 *   dist/zh/docs.html, dist/zh/docs/**  Chinese
 *   dist/docs/_next/**                  assets (next.config.ts assetPrefix)
 *
 * and makes it fit the site's policies:
 *  1. Content-Security-Policy: the site allows no inline script except one hashed theme script.
 *     Next writes its RSC payload as inline <script>s, so each run of consecutive inline scripts
 *     becomes one content-hashed file under docs/_next/static/inline/, deferred and placed before
 *     Next's (now deferred) chunks, so the payload is queued before the runtime reads it.
 *     The theme script is the public pages' own, byte for byte, so it stays inline under that hash.
 *  2. `<page>.md` for agents: Next renders docs/md/<slug>.md; they move next to the pages.
 *  3. One 404 page per language (docs/404.html, zh/docs/404.html) and an OG image per page.
 */
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { THEME_INIT_SCRIPT } from "../../kcq/scripts/landing-plugin.mjs";
import { renderOgImages } from "./lib/og.mjs";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const out = join(appRoot, "out");
const dist = join(appRoot, "dist");
const LANG_ROOTS = [
  { lang: "en", dir: "docs", page: "docs.html" },
  { lang: "zh", dir: "zh/docs", page: "zh/docs.html" },
];

function fail(message) {
  console.error(`postbuild: ${message}`);
  process.exit(1);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

if (!existsSync(out)) fail("out/ is missing; run next build first");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 1. Lay out the tree.
cpSync(join(out, "_next"), join(dist, "docs/_next"), { recursive: true });
for (const { lang, dir, page } of LANG_ROOTS) {
  if (!existsSync(join(out, page))) fail(`${page} is missing`);
  mkdirSync(dirname(join(dist, page)), { recursive: true });
  cpSync(join(out, page), join(dist, page));
  const txt = page.replace(/\.html$/, ".txt");
  if (existsSync(join(out, txt))) cpSync(join(out, txt), join(dist, txt));
  cpSync(join(out, dir), join(dist, dir), { recursive: true });
  const notFound = join(out, lang === "en" ? "docs-404.html" : "zh/docs-404.html");
  if (!existsSync(notFound)) fail(`${relative(out, notFound)} is missing`);
  cpSync(notFound, join(dist, dir, "404.html"));

  // <page>.md: docs/md/a/b.md → docs/a/b.md, docs/md/index.md → docs.md
  const mdRoot = join(dist, dir, "md");
  for (const file of walk(mdRoot)) {
    const rel = relative(mdRoot, file);
    const target = rel === "index.md" ? join(dist, `${dir}.md`) : join(dist, dir, rel);
    mkdirSync(dirname(target), { recursive: true });
    renameSync(file, target);
  }
  rmSync(mdRoot, { recursive: true, force: true });
}

// 3. Externalize inline scripts.
const inlineDir = join(dist, "docs/_next/static/inline");
mkdirSync(inlineDir, { recursive: true });
const INLINE =
  /<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/(?:ld\+)?json")([^>]*)>([\s\S]*?)<\/script>/g;
let pages = 0;
let externalized = 0;
for (const file of walk(dist).filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(file, "utf8");
  // The one inline script the CSP admits by hash stays inline; park it while the rest moves out.
  const themeTag = `<script>${THEME_INIT_SCRIPT}</script>`;
  if (!html.includes(themeTag)) fail(`${relative(dist, file)} lacks the shared theme script`);
  html = html.replace(themeTag, "<!--kcq-theme-init-->");
  // Group consecutive inline scripts (only whitespace between them) into one file.
  html = html.replace(
    /(?:<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/(?:ld\+)?json")[^>]*>[\s\S]*?<\/script>\s*)+/g,
    (run) => {
      const bodies = [...run.matchAll(INLINE)].map((m) => m[2].trim()).filter(Boolean);
      if (bodies.length === 0) return run;
      const code = `${bodies.join(";\n")};\n`;
      const name = `${hash(code)}.js`;
      const target = join(inlineDir, name);
      if (!existsSync(target)) writeFileSync(target, code);
      externalized += bodies.length;
      return `<script src="/docs/_next/static/inline/${name}" defer></script>`;
    },
  );
  // Run everything in document order after parsing: the payload first, then Next's chunks (async
  // → defer). With async chunks the runtime could start between the end of parsing and the deferred
  // payload, see readyState !== "loading", close its stream early and fail hydration (React #412).
  const payload = [
    ...html.matchAll(/<script src="\/docs\/_next\/static\/inline\/[^"]+" defer><\/script>/g),
  ].map((m) => m[0]);
  for (const tag of payload) html = html.replace(tag, "");
  const firstChunk = html.indexOf('<script src="/docs/_next/static/chunks/');
  if (payload.length && firstChunk < 0)
    fail(`${relative(dist, file)} has a payload but no Next chunks`);
  if (payload.length) html = html.slice(0, firstChunk) + payload.join("") + html.slice(firstChunk);
  html = html.replace(
    /(<script src="\/docs\/_next\/static\/chunks\/[^"]+"[^>]*?) async=""/g,
    '$1 defer=""',
  );
  if (INLINE.test(html)) fail(`${relative(dist, file)} still has an inline script`);
  INLINE.lastIndex = 0;
  html = html.replace("<!--kcq-theme-init-->", themeTag);
  writeFileSync(file, html);
  pages += 1;
}

// 4. Every asset a page references must exist.
for (const file of walk(dist).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  for (const [, url] of html.matchAll(/(?:src|href)="(\/docs\/(?:_next|fonts)\/[^"?#]+)"/g)) {
    if (!existsSync(join(dist, url))) fail(`${relative(dist, file)} references missing ${url}`);
  }
}

// 5. OG images, one per page and language, drawn from each page's own og:title/description.
const og = await renderOgImages(dist);

// out/ is Next's intermediate tree; dist/ is the artifact (repo lints skip dist/, not out/).
rmSync(out, { recursive: true, force: true });

// biome-ignore lint/suspicious/noConsole: build script — stdout is the report.
console.log(
  `postbuild: ${pages} pages, ${externalized} inline scripts externalized, ${og} OG images`,
);
