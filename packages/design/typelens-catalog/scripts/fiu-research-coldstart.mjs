#!/usr/bin/env node
/** Fonts In Use research cold-start — metadata only, free commercial fonts. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "research");
const BASE = "https://fontsinuse.com";
const UA = "NebutraTypeLensResearch/0.1 (+https://typelens.nebutra.com)";
const log = (s) => process.stdout.write(`${s}\n`);
const warn = (s) => process.stderr.write(`${s}\n`);

const FREE_FONT_MAP = {
  inter: "inter",
  "space-grotesk": "space-grotesk",
  "dm-sans": "dm-sans",
  fraunces: "fraunces",
  newsreader: "newsreader",
  "source-sans": "source-sans-3",
  "source-serif": "source-serif-4",
  "ibm-plex-sans": "ibm-plex-sans",
  "ibm-plex-serif": "ibm-plex-serif",
  "playfair-display": "playfair-display",
  "work-sans": "work-sans",
  "libre-baskerville": "libre-baskerville",
  "public-sans": "public-sans",
  manrope: "manrope",
};

const SEED = [
  "/typefaces/93554/inter",
  "/typefaces/105971/space-grotesk",
  "/typefaces/127861/dm-sans",
  "/typefaces/121631/fraunces",
  "/typefaces/152858/newsreader",
  "/typefaces/48059/ibm-plex-sans",
  "/typefaces/7709/playfair-display",
  "/typefaces/39678/work-sans",
  "/typefaces/31706/libre-baskerville",
  "/typefaces/140530/public-sans",
  "/typefaces/126975/manrope",
  "/typefaces/10819/source-sans",
];

function parseArgs(argv) {
  const out = { maxUsesPerFace: 5, delayMs: 10000, maxPages: 40 };
  for (const a of argv) {
    if (a.startsWith("--max-uses-per-face=")) out.maxUsesPerFace = Number(a.split("=")[1]);
    if (a.startsWith("--delay-ms=")) out.delayMs = Number(a.split("=")[1]);
    if (a.startsWith("--max-pages=")) out.maxPages = Number(a.split("=")[1]);
  }
  return out;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return { url: res.url, html: await res.text() };
}

function extractUses(html) {
  return [...new Set([...html.matchAll(/href="(\/uses\/\d+\/[a-z0-9-]+)"/gi)].map((m) => m[1]))];
}
function extractFamilies(html) {
  const m = html.match(/fiu-metaList--families[\s\S]*?<\/ul>/i);
  if (!m) return [];
  return [
    ...new Set(
      [...m[0].matchAll(/href="(\/typefaces\/\d+\/([a-z0-9-]+))"/gi)].map((x) =>
        x[2].toLowerCase(),
      ),
    ),
  ].map((slug) => ({ slug, catalogId: FREE_FONT_MAP[slug] ?? null }));
}
function extractTags(html) {
  const m = html.match(/fiu-metaList--tags[\s\S]*?<\/ul>/i);
  if (!m) return [];
  return [...m[0].matchAll(/\/tags\/\d+\/([a-z0-9-]+)/gi)].map((x) => x[1]);
}
function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1)
    return h1[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return (html.match(/<title>([^<]+)/i)?.[1] || "Untitled")
    .replace(/\s*-\s*Fonts In Use.*/i, "")
    .trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  let pages = 0;
  const uses = [];
  const skipped = [];

  for (const face of SEED) {
    if (pages >= args.maxPages) break;
    log(`typeface ${face}`);
    await sleep(args.delayMs);
    let faceHtml;
    try {
      faceHtml = (await fetchHtml(face)).html;
      pages += 1;
    } catch (e) {
      skipped.push({ path: face, reason: String(e) });
      continue;
    }
    for (const usePath of extractUses(faceHtml).slice(0, args.maxUsesPerFace)) {
      if (pages >= args.maxPages) break;
      await sleep(args.delayMs);
      try {
        const r = await fetchHtml(usePath);
        pages += 1;
        const families = extractFamilies(r.html);
        const free = families.filter((f) => f.catalogId);
        if (!free.length) {
          skipped.push({
            path: usePath,
            reason: "no-free-fonts",
            families: families.map((f) => f.slug),
          });
          log(`  skip ${usePath}`);
          continue;
        }
        const row = {
          useId: usePath.match(/\/uses\/(\d+)/)?.[1],
          usePath,
          canonicalUrl: r.url,
          title: extractTitle(r.html),
          tags: extractTags(r.html),
          freeTypefaces: free.map((f) => f.catalogId),
          paidDropped: families.filter((f) => !f.catalogId).map((f) => f.slug),
        };
        uses.push(row);
        log(`  keep ${usePath} -> ${row.freeTypefaces.join("+")}`);
      } catch (e) {
        skipped.push({ path: usePath, reason: String(e) });
      }
    }
  }

  const byId = new Map(uses.map((u) => [u.useId, u]));
  const deduped = [...byId.values()];
  writeFileSync(
    join(OUT_DIR, "fiu-coldstart.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), uses: deduped, skipped }, null, 2),
  );
  writeFileSync(
    join(OUT_DIR, "fiu-seed-draft.json"),
    JSON.stringify({ count: deduped.length, items: deduped }, null, 2),
  );
  log(`Done kept=${deduped.length} skipped=${skipped.length} pages=${pages}`);
}

main().catch((e) => {
  warn(String(e));
  process.exit(1);
});
