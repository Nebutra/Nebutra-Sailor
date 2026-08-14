#!/usr/bin/env node
/**
 * Promote FIU research JSON → slim free-commercial product catalog.
 *
 * Source: research/fiu-traverse-*.json (gitignored crawl output)
 * Output: src/generated/fiu-catalog.json (bundled into dist)
 *
 * Rules:
 * - Free commercial faces only (Google Fonts / OFL heuristics / freeTypefaces field)
 * - Prefer multi-face uses with cover art
 * - Hard CAP to keep CF Worker under size/CPU budget
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const researchDir = path.join(root, "research");
const outDir = path.join(root, "src", "generated");
const outFile = path.join(outDir, "fiu-catalog.json");

/**
 * Promotion is an authoring step, not a build step.
 *
 * The research JSONs are gitignored on purpose — the crawl state alone is 42MB
 * — and `fiu-catalog.json` is the committed artifact they produce. But this ran
 * from `prebuild` unconditionally, so every clean checkout threw "Missing
 * research file" and took the whole CI build with it. It has been red since
 * 2026-08-04 for that reason and no other.
 *
 * With the inputs absent and the catalog already present, the right thing is to
 * leave the committed catalog alone and say so. Absent inputs AND no catalog is
 * still an error: that is a genuinely unbuildable package, not a checkout
 * without the crawl.
 */
const REQUIRED_RESEARCH = [
  "fiu-traverse-uses.json",
  "fiu-traverse-typefaces.json",
  "fiu-traverse-nameplates.json",
];

const haveResearch = REQUIRED_RESEARCH.every((name) => fs.existsSync(path.join(researchDir, name)));

if (!haveResearch) {
  if (fs.existsSync(outFile)) {
    process.stdout.write(
      "fiu-promote: no research crawl present — keeping the committed " +
        "src/generated/fiu-catalog.json. Run `pnpm research:fiu:quick` to refresh it.\n",
    );
    process.exit(0);
  }
  process.stderr.write(
    "fiu-promote: no research crawl AND no committed catalog at " +
      `${outFile}. Run \`pnpm research:fiu:quick\` then \`pnpm research:fiu:promote\`.\n`,
  );
  process.exit(1);
}

const CAP = Number(process.env.FIU_PROMOTE_CAP || 500);
const MAX_IMAGES = Number(process.env.FIU_PROMOTE_MAX_IMAGES || 3);

const OFL = {
  spdxOrLabel: "OFL-1.1",
  commercialOk: true,
  attributionRequired: false,
  redistributable: true,
  licenseUrl: "https://scripts.sil.org/OFL",
};

const ROLE_CYCLE = ["display", "body", "headline", "caption", "accent", "mono"];

function readJson(name) {
  const p = path.join(researchDir, name);
  if (!fs.existsSync(p)) throw new Error(`Missing research file: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function slugifyFamily(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function isFreeFace(tf, plate, freeFieldSlugs) {
  const slug = plate?.slug || tf?.slug;
  if (slug && freeFieldSlugs?.has(slug)) return true;
  if (tf?.commercialOk === true) return true;
  const hay = [
    tf?.foundryUrl,
    plate?.foundryUrl,
    tf?.fiuUrl,
    plate?.fiuUrl,
    tf?.family,
    plate?.family,
  ]
    .filter(Boolean)
    .join(" ");
  if (/fonts\.google\.com/i.test(hay)) return true;
  if (
    /github\.com\/adobe-fonts|rsms\.me\/inter|public-sans\.digital|scripts\.sil\.org/i.test(hay)
  ) {
    return true;
  }
  return false;
}

function guessCategory(family = "") {
  const f = family.toLowerCase();
  if (/mono|code|console|plex mono|jetbrains/i.test(f)) return "mono";
  if (/serif|garamond|baskerville|caslon|times|playfair|fraunces|libre/i.test(f)) return "serif";
  if (/display|bebas|impact|poster|blackletter/i.test(f)) return "display";
  if (/script|hand|brush|cursive/i.test(f)) return "handwriting";
  return "sans";
}

function cssStack(family) {
  const safe = String(family).replace(/"/g, "");
  return `"${safe}", system-ui, sans-serif`;
}

function mediumOf(use) {
  const m = use.medium;
  const allowed = new Set([
    "poster",
    "website",
    "app-ui",
    "brand-identity",
    "editorial",
    "packaging",
    "other",
  ]);
  if (allowed.has(m)) return m;
  const formats = (use.formats || []).map((f) => f.slug || f).join(" ");
  if (/poster|flyer/i.test(formats)) return "poster";
  if (/packaging|label/i.test(formats)) return "packaging";
  if (/branding|identity|logo/i.test(formats)) return "brand-identity";
  if (/editorial|magazine|book/i.test(formats)) return "editorial";
  if (/website|web|app|ui/i.test(formats)) return "website";
  return "other";
}

function main() {
  const { uses } = readJson("fiu-traverse-uses.json");
  const { typefaces: researchTfs } = readJson("fiu-traverse-typefaces.json");
  const tfBySlug = new Map(researchTfs.map((t) => [t.slug, t]));

  /** @type {Map<string, any>} */
  const typefaces = new Map();
  /** @type {any[]} */
  const candidates = [];

  for (const use of uses) {
    if (!use?.coverUrl || !/^https?:\/\//i.test(use.coverUrl)) continue;

    const freeField = new Set(use.freeTypefaces || []);
    const plates = use.nameplates || [];
    const freePlates = [];
    const seen = new Set();

    for (const p of plates) {
      if (!p?.slug || seen.has(p.slug)) continue;
      const tf = tfBySlug.get(p.slug);
      if (!isFreeFace(tf, p, freeField)) continue;
      seen.add(p.slug);
      freePlates.push({ plate: p, tf });
    }
    // freeTypefaces without nameplate entry
    for (const slug of freeField) {
      if (seen.has(slug)) continue;
      const tf = tfBySlug.get(slug);
      if (!isFreeFace(tf, null, freeField) && !tf) continue;
      if (tf && !isFreeFace(tf, null, freeField)) continue;
      seen.add(slug);
      freePlates.push({
        plate: {
          slug,
          family: tf?.family || slug,
          sampleImageUrl: tf?.sampleImageUrl,
          foundryUrl: tf?.foundryUrl,
        },
        tf,
      });
    }

    if (freePlates.length < 1) continue;

    const freeIds = [];
    for (const { plate, tf } of freePlates) {
      const id = slugifyFamily(plate.slug || plate.family);
      if (!id) continue;
      freeIds.push(id);
      if (!typefaces.has(id)) {
        const family = (tf?.family || plate.family || id).replace(/\s+in use$/i, "").trim();
        typefaces.set(id, {
          id,
          family,
          foundry: "Open / Google / free-commercial",
          scripts: ["latin"],
          category: guessCategory(family),
          cssStack: cssStack(family),
          sourceUrl:
            plate.foundryUrl ||
            tf?.foundryUrl ||
            tf?.fiuUrl ||
            `https://fonts.google.com/specimen/${encodeURIComponent(family.replace(/\s+/g, "+"))}`,
          sampleImageUrl: plate.sampleImageUrl || tf?.sampleImageUrl,
          license: { ...OFL },
          notes: "Promoted from FIU free/commercial-ok metadata.",
        });
      } else if (
        (plate.sampleImageUrl || tf?.sampleImageUrl) &&
        !typefaces.get(id).sampleImageUrl
      ) {
        typefaces.get(id).sampleImageUrl = plate.sampleImageUrl || tf?.sampleImageUrl;
      }
    }

    if (freeIds.length < 1) continue;

    const uniqueIds = [...new Set(freeIds)];
    const nameplateUrls = freePlates
      .map(({ plate, tf }) => plate.sampleImageUrl || tf?.sampleImageUrl)
      .filter((u) => u && /^https?:\/\//i.test(u));

    const imageAssets = [use.coverUrl, ...nameplateUrls]
      .filter((u, i, arr) => u && arr.indexOf(u) === i)
      .slice(0, MAX_IMAGES);

    const useId = String(use.useId || use.usePath || "").replace(/[^\w-]+/g, "-");
    const slugBase = (use.usePath || "").split("/").filter(Boolean).pop() || `use-${useId}`;
    const workSlug = `fiu-${slugBase}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .slice(0, 80);

    candidates.push({
      multi: uniqueIds.length,
      hasCover: 1,
      use,
      uniqueIds,
      imageAssets,
      workSlug,
      useId,
    });
  }

  // Prefer multi-face systems, then those with more free faces
  candidates.sort((a, b) => {
    if (b.multi !== a.multi) return b.multi - a.multi;
    return b.uniqueIds.length - a.uniqueIds.length;
  });

  const picked = candidates.slice(0, CAP);
  const usedTf = new Set();
  const works = [];
  const specimens = [];

  for (const c of picked) {
    for (const id of c.uniqueIds) usedTf.add(id);
    const workId = `work-fiu-${c.useId}`;
    const medium = mediumOf(c.use);
    const tags = (c.use.tags || []).slice(0, 12);
    const moods = (c.use.topics || []).slice(0, 6);

    works.push({
      id: workId,
      slug: c.workSlug,
      title: c.use.title || c.workSlug,
      medium,
      industry: (c.use.topics || [])[0],
      mood: moods.length ? moods : ["editorial"],
      scripts: ["latin"],
      sourceUrl: c.use.canonicalUrl,
      imageAssets: c.imageAssets,
      curatorNotes: "Promoted from Fonts In Use research (free-commercial faces only).",
      status: "published",
    });

    const typefacesRefs = c.uniqueIds.slice(0, 6).map((typefaceId, i) => ({
      typefaceId,
      role: ROLE_CYCLE[i % ROLE_CYCLE.length],
      weight: i === 0 ? 600 : 400,
    }));

    const hierarchy = typefacesRefs.map((ref, i) => ({
      role: ref.role,
      rem: [3.2, 1.5, 1.125, 0.875, 1, 0.875][i] ?? 1,
      weight: ref.weight,
      leading: [1.1, 1.3, 1.6, 1.4, 1.4, 1.5][i] ?? 1.4,
    }));

    const families = typefacesRefs.map((r) => typefaces.get(r.typefaceId)?.family || r.typefaceId);
    specimens.push({
      id: `spec-fiu-${c.useId}`,
      workId,
      typefaces: typefacesRefs,
      pairing: {
        strategy: families.join(" + "),
        contrast: typefacesRefs.length >= 2 ? "medium" : "harmonious",
      },
      hierarchy,
      tags: ["fiu-promote", ...tags].slice(0, 16),
      confidence: typefacesRefs.length >= 2 ? 0.82 : 0.72,
      verifiedBy: "hybrid",
      summary: `${c.use.title || "Work"}: ${families.join(" + ")}.`,
    });
  }

  const tfOut = [...typefaces.values()].filter((t) => usedTf.has(t.id));
  // Drop invalid sourceUrl if not URL
  for (const t of tfOut) {
    try {
      new URL(t.sourceUrl);
    } catch {
      t.sourceUrl = `https://fontsinuse.com/typefaces/${t.id}`;
    }
    if (t.sampleImageUrl) {
      try {
        new URL(t.sampleImageUrl);
      } catch {
        delete t.sampleImageUrl;
      }
    }
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    source: "fiu-traverse-uses.json",
    stats: {
      usesIn: uses.length,
      candidates: candidates.length,
      works: works.length,
      specimens: specimens.length,
      typefaces: tfOut.length,
      multiFaceWorks: works.filter((_, i) => picked[i].multi >= 2).length,
      withCover: works.filter((w) => w.imageAssets?.length).length,
      cap: CAP,
    },
    typefaces: tfOut,
    works,
    specimens,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(catalog));
  // CLI progress — not app runtime logging
  process.stdout.write(`Wrote ${outFile}\n${JSON.stringify(catalog.stats, null, 2)}\n`);
}

main();
