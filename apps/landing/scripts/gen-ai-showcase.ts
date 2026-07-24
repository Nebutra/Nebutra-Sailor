/**
 * gen-ai-showcase — regenerate the landing AI-provider showcase from the live
 * model catalog (models.dev + OpenRouter via @nebutra/ai-providers/catalog).
 *
 * WHY: the landing page used to hand-type frontier model rows
 * (`deepseek-v3.2`, `gpt-5.5`, …). Hand-typed model strings rot — DeepSeek
 * shipped V4 while the page still said V3.2. The catalog is the
 * "don't-hand-maintain-model-strings" engine; this script makes the marketing
 * surface a consumer of it. The output is committed so builds stay
 * deterministic and offline-safe; refresh with:
 *
 *   pnpm --filter @nebutra/landing gen:ai-showcase
 *
 * Run: tsx apps/landing/scripts/gen-ai-showcase.ts
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogModel, ModelOffering } from "../../../packages/ai/ai-providers/src/catalog";
import {
  listModelsByModality,
  resolveFrontierModel,
} from "../../../packages/ai/ai-providers/src/catalog";
import { PROVIDERS } from "../../../packages/ai/ai-providers/src/meta";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/components/landing/features/glyphs/ai-showcase.generated.ts");

// ── Helpers (mirror the catalog's id math so logical keys line up) ────────────
const bareId = (id: string): string => id.slice(id.indexOf("/") + 1);
const collapse = (s: string): string => s.toLowerCase().replace(/[._:\-\s]/g, "");
/**
 * Family version from a `vN[.M]` token only — NOT any bare number. Names like
 * "DeepSeek Chat 0324" carry a date suffix that a naive parser reads as v324
 * and ranks above V4; requiring the literal `v` avoids that.
 */
const versionOf = (s: string): number => {
  const m = s.match(/v(\d+(?:\.\d+)?)/i);
  return m ? Number.parseFloat(m[1]) : -1;
};

function formatContext(ctx: number | undefined): string {
  if (!ctx || ctx <= 0) return "—";
  if (ctx >= 1_000_000) return `${Math.round(ctx / 100_000) / 10}M`.replace(".0M", "M");
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
  return String(ctx);
}

function formatPrice(perMTok: number | undefined): string {
  if (perMTok == null || perMTok <= 0) return "—";
  // Trim trailing zeros: 3 → "$3", 0.28 → "$0.28", 2.5 → "$2.5".
  const rounded = Math.round(perMTok * 100) / 100;
  return `$${String(rounded)}`;
}

/** Max real context window across a logical model's offerings. */
function bestContext(model: CatalogModel): number | undefined {
  return model.offerings.reduce<number | undefined>((max, o) => {
    const c = o.contextWindow;
    if (c == null) return max;
    return max == null || c > max ? c : max;
  }, undefined);
}

/** Median positive input price across offerings — honest, not the cheapest reseller. */
function medianPrice(model: CatalogModel): number | undefined {
  const prices = model.offerings
    .map((o: ModelOffering) => o.pricing?.inputPerMTok)
    .filter((p): p is number => typeof p === "number" && p > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return undefined;
  return prices[Math.floor((prices.length - 1) / 2)];
}

/** A clean display label from a logical model's canonical offering id. */
function displayLabel(model: CatalogModel): string {
  // Prefer the shortest bare id (least aggregator noise) among offerings.
  const bare = model.offerings.map((o) => bareId(o.id)).sort((a, b) => a.length - b.length);
  return (bare[0] ?? model.name).toLowerCase();
}

type Row = { model: string; context: string; price: string };

function toRow(model: CatalogModel): Row {
  return {
    model: displayLabel(model),
    context: formatContext(bestContext(model)),
    price: formatPrice(medianPrice(model)),
  };
}

async function main() {
  const text = await listModelsByModality("text");
  if (text.length === 0) {
    throw new Error("catalog returned 0 text models — refusing to write an empty showcase");
  }
  const byKey = new Map(text.map((m) => [m.key, m]));

  // Resolve the three tiered frontiers, then map the routable id back to its
  // logical catalog entry (dedupKey collapses dots/dashes identically).
  const tieredIds = await Promise.all([
    resolveFrontierModel("flagship"), // Anthropic Sonnet
    resolveFrontierModel("openai-flagship"), // GPT-5.x
    resolveFrontierModel("google-flagship"), // Gemini Pro
  ]);

  const picked: CatalogModel[] = [];
  const seen = new Set<string>();
  for (const id of tieredIds) {
    const model = byKey.get(collapse(bareId(id)));
    if (model && !seen.has(model.key)) {
      picked.push(model);
      seen.add(model.key);
    }
  }

  // DeepSeek has no semantic tier — pick the newest non-distill chat/pro frontier
  // straight from the catalog (this is the row that exposed the V3.2→V4 drift).
  // Drop reseller/quant marketing variants so the row stays on the canonical id.
  const dsVariant =
    /(distill|reasoner|vl|tee|cheaper|lightning|maas|speciale|free|6bit|exp|thinking|el)/;
  const dsCandidates = text.filter(
    (m) => m.key.includes("deepseek") && !dsVariant.test(m.key) && bestContext(m) != null,
  );
  const dsMax = dsCandidates.reduce((max, m) => Math.max(max, versionOf(m.name)), -1);
  const deepseek = dsCandidates
    .filter((m) => versionOf(m.name) === dsMax)
    .sort((a, b) => {
      const proRank = (m: CatalogModel) => (m.key.includes("pro") ? 0 : 1);
      if (proRank(a) !== proRank(b)) return proRank(a) - proRank(b);
      return displayLabel(a).length - displayLabel(b).length;
    })[0];
  if (deepseek && !seen.has(deepseek.key)) {
    picked.push(deepseek);
    seen.add(deepseek.key);
  }

  const rows = picked.map(toRow);
  const providerCount = PROVIDERS.length;

  // Emit Biome-clean source (one row per line, unquoted keys) so re-running the
  // generator never churns the formatter.
  const rowsSrc = rows
    .map(
      (r) =>
        `  { model: ${JSON.stringify(r.model)}, context: ${JSON.stringify(r.context)}, price: ${JSON.stringify(r.price)} },`,
    )
    .join("\n");

  const body = `// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source: models.dev + OpenRouter, via @nebutra/ai-providers/catalog.
// Regenerate: pnpm --filter @nebutra/landing gen:ai-showcase
//
// Hand-typed model strings rot (DeepSeek shipped V4 while this page said V3.2).
// These rows are derived from the live catalog so the marketing surface can
// never silently drift past the frontier.

export interface AiShowcaseRow {
  /** Concrete frontier model id (no aggregator prefix). */
  readonly model: string;
  /** Context window, human-formatted (e.g. "1M", "256K"). */
  readonly context: string;
  /** Representative input price per 1M tokens (median across offerings). */
  readonly price: string;
}

export const AI_SHOWCASE_ROWS: readonly AiShowcaseRow[] = [
${rowsSrc}
];

/** Count of supported provider buckets (from the provider registry). */
export const AI_SHOWCASE_PROVIDER_COUNT = ${providerCount};
`;

  await writeFile(OUT, body, "utf8");
  process.stdout.write(
    `✓ wrote ${rows.length} frontier rows + ${providerCount} providers → ${OUT}\n`,
  );
  for (const r of rows) {
    process.stdout.write(`  · ${r.model.padEnd(28)} ${r.context.padEnd(6)} ${r.price}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`gen-ai-showcase failed: ${err?.message ?? err}\n`);
  process.exit(1);
});
