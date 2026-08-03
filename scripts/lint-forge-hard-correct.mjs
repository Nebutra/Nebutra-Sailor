#!/usr/bin/env node
/**
 * Forge hard-correct gates — no degraded product positioning.
 *
 * 1. Every registered tool slug must have an explicit case in
 *    apps/forge/src/components/tool-workspace.tsx or catalog-runners.tsx.
 * 2. Product tool descriptions (registered via F0_BATCH1_TOOLS export arrays)
 *    must not use banned degradation language.
 * 3. Default md-to-pdf engine must not be "auto" (silent fallback banned).
 *
 * Run: node scripts/lint-forge-hard-correct.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const toolsDir = join(root, "packages/ai/forge-runtime/src/tools");
const workspacePath = join(root, "apps/forge/src/components/tool-workspace.tsx");
const catalogPath = join(root, "apps/forge/src/components/catalog-runners.tsx");
const mdToPdfPath = join(root, "packages/ai/forge-runtime/src/tools/md-to-pdf.ts");
const indexPath = join(root, "packages/ai/forge-runtime/src/tools/index.ts");

const BANNED_DESC =
  /\b(lab:|dictionary only|not a full|not full |lightweight dictionary|coarse carrier|shell only|fell back|silent fallback)\b/i;
const BANNED_ZH = /实验：|非完整引擎|非完整归属|翻译壳|号段粗分/;

/** Tools allowed to remain in source but must not be product-exported. */
/** Still deferred — no SOTA product path yet. */
const DELISTED_SLUGS = new Set(["kinship", "phone-lookup", "router-translate"]);

function walkTs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTs(p, out);
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

function extractCases(source) {
  return new Set([...source.matchAll(/^\s{4}case "([^"]+)":/gm)].map((m) => m[1]));
}

function extractExportArraySlugs(fileText, arrayName) {
  const re = new RegExp(
    `export const ${arrayName}[\\s\\S]*?=\\s*\\[([\\s\\S]*?)\\];`,
    "m",
  );
  const m = fileText.match(re);
  if (!m) return [];
  // Collect tool const names referenced in the array
  return [...m[1].matchAll(/\b([A-Za-z0-9_]+Tool[s]?)\b/g)].map((x) => x[1]);
}

/** Map tool const export → slug from same file. */
function slugForToolSymbol(files, symbol) {
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    // single tool: export const fooTool = tool({ ... slug: "x"
    if (symbol.endsWith("Tools") || symbol.endsWith("s")) {
      // array of tools expanded elsewhere — skip
      continue;
    }
    const re = new RegExp(
      `export const ${symbol}\\s*=\\s*tool\\(\\{[\\s\\S]*?slug:\\s*"([^"]+)"`,
      "m",
    );
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Extract balanced `[...]` after `export const name =` (ignores `[]` inside bodies). */
function extractExportArrayBody(text, arrayName) {
  const startRe = new RegExp(`export const ${arrayName}[\\s\\S]*?=\\s*\\[`, "m");
  const m = startRe.exec(text);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "[") depth++;
    else if (ch === "]") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return text.slice(m.index + m[0].length, i - 1);
}

function slugsFromExportArray(text, arrayName) {
  const body = extractExportArrayBody(text, arrayName);
  if (body !== null) {
    return [...body.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  }
  // Mapped / composed: export const name = SOMETHING.map(...) or filter
  if (
    new RegExp(`export const ${arrayName}[\\s\\S]{0,200}=\\s*[\\w.]+\\.(map|filter)`, "m").test(
      text,
    )
  ) {
    return [...text.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  }
  return null;
}

function collectProductSlugs() {
  const files = walkTs(toolsDir);
  const indexText = readFileSync(indexPath, "utf8");
  const arrMatch = indexText.match(
    /export const F0_BATCH1_TOOLS[\s\S]*?=\s*\[([\s\S]*?)\];/m,
  );
  if (!arrMatch) {
    throw new Error("Could not parse F0_BATCH1_TOOLS from tools/index.ts");
  }
  const body = arrMatch[1];
  const spreadNames = [...body.matchAll(/\.\.\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
  const bareNames = [...body.matchAll(/\b([A-Za-z0-9_]+Tool)\b/g)]
    .map((m) => m[1])
    .filter((n) => !n.endsWith("Tools"));

  const slugs = new Set();
  const symbolToSlug = new Map();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(
      /export const ([A-Za-z0-9_]+Tool)\s*=\s*(?:tool\(|\{)[\s\S]*?slug:\s*"([^"]+)"/g,
    )) {
      symbolToSlug.set(m[1], m[2]);
    }
    // ForgeToolDefinition form: export const xTool: ForgeToolDefinition = { slug: }
    for (const m of text.matchAll(
      /export const ([A-Za-z0-9_]+Tool)[\s\S]{0,400}?slug:\s*"([^"]+)"/g,
    )) {
      if (!symbolToSlug.has(m[1])) symbolToSlug.set(m[1], m[2]);
    }
  }

  for (const name of bareNames) {
    const slug = symbolToSlug.get(name) ?? slugForToolSymbol(files, name);
    if (slug) slugs.add(slug);
  }

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const spread of spreadNames) {
      if (!text.includes(spread)) continue;
      const fromArray = slugsFromExportArray(text, spread);
      if (fromArray) {
        const body = extractExportArrayBody(text, spread);
        if (body !== null) {
          const members = [...body.matchAll(/\b([A-Za-z0-9_]+Tool)\b/g)].map((x) => x[1]);
          for (const member of members) {
            const slug = symbolToSlug.get(member);
            if (slug) slugs.add(slug);
          }
        }
        for (const s of fromArray) slugs.add(s);
      }
    }
  }

  slugs.add("md-to-pdf");
  // Hard-correct: delisted never product even if still in source
  for (const d of DELISTED_SLUGS) slugs.delete(d);
  return slugs;
}

function main() {
  const errors = [];
  const productSlugs = collectProductSlugs();

  // Delisted must not appear in product set
  for (const d of DELISTED_SLUGS) {
    if (productSlugs.has(d)) {
      errors.push(`delisted slug still in product registry: ${d}`);
    }
  }

  const workspace = readFileSync(workspacePath, "utf8");
  const catalog = readFileSync(catalogPath, "utf8");
  const ui = new Set([...extractCases(workspace), ...extractCases(catalog)]);

  const missingUi = [...productSlugs].filter((s) => !ui.has(s)).sort();
  for (const s of missingUi) {
    errors.push(
      `registered slug "${s}" has no explicit tool-workspace/catalog case (orphan UI)`,
    );
  }

  // Ban degradation language on **product-exported** tool objects only.
  // Heuristic: for each product slug, find description block near slug in tools/.
  for (const file of walkTs(toolsDir)) {
    const text = readFileSync(file, "utf8");
    const slugMatches = [...text.matchAll(/slug:\s*"([^"]+)"/g)];
    for (const sm of slugMatches) {
      const slug = sm[1];
      if (!productSlugs.has(slug)) continue;
      const start = Math.max(0, sm.index - 400);
      const end = Math.min(text.length, sm.index + 800);
      const window = text.slice(start, end);
      if (BANNED_DESC.test(window) || BANNED_ZH.test(window)) {
        errors.push(
          `degraded-positioning language near product slug "${slug}" in ${relative(root, file)}`,
        );
      }
    }
  }

  const md = readFileSync(mdToPdfPath, "utf8");
  if (/z\.enum\(\["auto"/.test(md) || /\.default\("auto"\)/.test(md)) {
    errors.push('md-to-pdf must not default/include engine "auto" (silent fallback banned)');
  }
  if (/fell back to structured PDF/i.test(md)) {
    errors.push("md-to-pdf still contains silent simple fallback path");
  }

  if (errors.length) {
    console.error("lint-forge-hard-correct: FAILED\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} issue(s). See docs/plans/tools/_hard-correct-decisions.md`);
    process.exit(1);
  }
  console.log(
    `lint-forge-hard-correct: OK (${productSlugs.size} product slugs, ${DELISTED_SLUGS.size} delisted)`,
  );
}

main();
