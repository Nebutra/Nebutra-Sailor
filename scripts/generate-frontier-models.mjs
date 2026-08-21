#!/usr/bin/env node
/**
 * Regenerate the frontier model fallbacks from the live gateway catalogue.
 *
 * Two files used to hand-carry the "current frontier" model ids — the
 * `fallback` fields in `packages/ai/ai-providers/src/catalog.ts` and the
 * presets in `packages/ai/agents/src/sdk/models.ts` — with an audit date in a
 * comment. They drifted independently and nothing failed when they did: on
 * 2026-08-21 the reasoning tier still said `claude-opus-4.8` and the flagship
 * `claude-sonnet-4.6`, two releases after `claude-opus-5` and
 * `claude-sonnet-5` had shipped, and the OpenAI tier named `gpt-5.5` after the
 * whole `gpt-5.6` family existed. A stale id is worse than a missing one: it
 * routes to a real, older model, so nothing errors and the only symptom is
 * weaker output.
 *
 * So the ids become derived. This script picks, per tier, the newest model
 * that OpenRouter actually routes today, and writes one generated file per
 * consuming package — separate files rather than a shared import, because
 * `@nebutra/agents` does not depend on `@nebutra/ai-providers` and adding that
 * edge for six strings is not worth a lockfile change.
 *
 * The matching rules below are the ones in `catalog.ts`'s TIER_RULES;
 * `frontier-rules-parity.test.ts` fails if the two ever diverge.
 *
 * Usage:
 *   node scripts/generate-frontier-models.mjs           # rewrite in place
 *   node scripts/generate-frontier-models.mjs --check    # CI / pre-commit drift gate
 *
 * `--check` needs the network. It reports "skipped" and exits 0 when the
 * catalogue cannot be reached, because a flaky gate that blocks commits when
 * OpenRouter is down teaches people to bypass it.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MODELS_URL = process.env.OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models";

/**
 * Per-tier selection rules. `include` picks the family, `exclude` drops
 * variants that are not the interactive frontier model of that tier.
 *
 * `:batch` is excluded everywhere on purpose. OpenRouter lists a batch-only
 * endpoint for most frontier models, it satisfies every family pattern, and
 * routing an interactive stream at one fails — the previous rules let it
 * through and only the arbitrary iteration order of a Set kept it from
 * winning.
 */
export const TIER_MATCHERS = {
  reasoning: {
    include: "^anthropic\\/claude-opus-",
    exclude: "-(fast|mini|nano|image|codex)|:batch",
  },
  flagship: {
    include: "^anthropic\\/claude-sonnet-",
    exclude: "-(fast|mini|nano|image|codex)|:batch",
  },
  fast: {
    include: "^anthropic\\/claude-haiku-",
    exclude: "-(image|codex)|:batch",
  },
  "openai-flagship": {
    include: "^openai\\/gpt-5",
    exclude: "-(pro|mini|nano|codex|image|chat)|gpt-5\\.\\d+-(mini|nano|pro)|:batch",
  },
  "google-flagship": {
    include: "^google\\/gemini-.*pro",
    exclude: "-(image|tts|customtools)|:batch",
  },
  "google-fast": {
    include: "^google\\/gemini-.*flash",
    exclude: "-(image|tts|lite)|:batch",
  },
};

/** Leading version number of the bare id — `gpt-5.6-sol` → 5.6. */
function versionOf(id) {
  const bare = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  const match = bare.match(/(\d+(?:\.\d+)?)/);
  return match?.[1] ? Number.parseFloat(match[1]) : -1;
}

/**
 * Newest routable id per tier.
 *
 * Ties on version number are broken by price, highest first: when a vendor
 * ships one generation under several names (gpt-5.6 sol / terra / luna) the
 * dearest is the flagship. Sorting by version alone left the winner to Set
 * iteration order.
 */
function selectFrontier(models) {
  const priceOf = (m) => Number.parseFloat(m.pricing?.completion ?? "0") || 0;
  const selected = {};

  for (const [tier, matcher] of Object.entries(TIER_MATCHERS)) {
    const include = new RegExp(matcher.include);
    const exclude = new RegExp(matcher.exclude);
    const candidates = models.filter((m) => include.test(m.id) && !exclude.test(m.id));

    if (candidates.length === 0) {
      throw new Error(
        `[frontier-models] no routable model matched tier "${tier}". ` +
          `Either the vendor renamed the family or the include pattern is wrong — ` +
          `do NOT let this fall back silently, the whole point is that the id is real.`,
      );
    }

    candidates.sort((a, b) => versionOf(b.id) - versionOf(a.id) || priceOf(b) - priceOf(a));
    selected[tier] = candidates[0].id;
  }

  return selected;
}

/** Ignore separator and case differences: `claude-haiku-4.5` ≡ `claude_Haiku-4-5`. */
const collapse = (s) => s.toLowerCase().replace(/[._-]/g, "");

/**
 * Map each frontier id to the id 302.AI actually serves.
 *
 * Stripping the gateway prefix is not enough there. OpenRouter writes
 * `anthropic/claude-haiku-4.5`; 302 lists `claude-haiku-4-5-20251001` — dashes
 * for dots plus a release date — and a request for the stripped form comes back
 * 503 "No available models currently", which reads like an outage rather than a
 * wrong id. Five of the six tiers happen to line up; that one does not, and
 * which ones line up will change with every release, so the mapping is resolved
 * rather than assumed.
 *
 * Needs AI302_API_KEY (302 requires auth even to list models). Without it the
 * previously generated aliases are kept, so CI does not silently empty the map.
 */
async function resolve302Aliases(selected, previous) {
  const key = process.env.AI302_API_KEY;
  if (!key) return { aliases: previous, resolved: false };

  const res = await fetch(`${process.env.AI302_BASE_URL ?? "https://api.302.ai/v1"}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`302 model list: HTTP ${res.status}`);
  const ids = ((await res.json()).data ?? []).map((m) => m.id).filter(Boolean);

  const byCollapsed = new Map();
  for (const id of ids) {
    const k = collapse(id);
    if (!byCollapsed.has(k)) byCollapsed.set(k, id);
  }

  const aliases = {};
  for (const [tier, gatewayId] of Object.entries(selected)) {
    const bare = gatewayId.slice(gatewayId.indexOf("/") + 1);
    const target = collapse(bare);

    if (byCollapsed.has(target)) continue; // served verbatim — no alias needed

    // Otherwise take the shortest id that starts with the same collapsed stem:
    // shortest wins so `claude-haiku-4-5-20251001` beats
    // `claude-haiku-4-5-20251001-thinking`, which is a different model.
    const candidates = ids.filter((id) => collapse(id).startsWith(target));
    candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
    if (candidates[0]) aliases[tier] = candidates[0];
  }

  return { aliases, resolved: true };
}

function renderModule(selected, generatedAt, aliases) {
  const entries = Object.entries(selected)
    .map(([tier, id]) => `  "${tier}": "${id}",`)
    .join("\n");
  const aliasEntries = Object.entries(aliases)
    .map(([tier, id]) => `  "${tier}": "${id}",`)
    .join("\n");

  return `// GENERATED — do not edit by hand.
// Run \`pnpm gen:frontier-models\` to refresh from the live gateway catalogue.
//
// The newest model OpenRouter routes for each tier, resolved ${generatedAt}.
// These are the offline fallbacks: \`resolveFrontierModel()\` re-resolves against
// the live list at runtime and only lands here when that list is unreachable.

export const FRONTIER_FALLBACK = {
${entries}
} as const;

export type FrontierTier = keyof typeof FRONTIER_FALLBACK;

/**
 * Tiers whose id 302.AI spells differently from the gateway. Only the tiers
 * that actually differ appear; everything else is served under the bare id.
 * A missing entry means "no alias needed", never "unknown".
 */
export const AI302_ALIASES: Partial<Record<FrontierTier, string>> = {
${aliasEntries}
};
`;
}

const TARGETS = [
  "packages/ai/ai-providers/src/frontier-fallback.generated.ts",
  "packages/ai/agents/src/sdk/frontier-fallback.generated.ts",
];

async function main() {
  const check = process.argv.includes("--check");

  let models;
  try {
    const res = await fetch(MODELS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    models = (json.data ?? []).filter((m) => typeof m?.id === "string");
    if (models.length === 0) throw new Error("empty model list");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stdout.write(`frontier-models: skipped — catalogue unreachable (${reason})\n`);
    process.exit(0);
  }

  const selected = selectFrontier(models);

  // The date is the only volatile part of the output, so on --check the
  // on-disk header date is reused; otherwise every check run would report
  // drift for a file whose model ids are perfectly current.
  const existingSource = readFileSync(path.join(REPO_ROOT, TARGETS[0]), "utf8");
  const existing = existingSource.match(/resolved (\d{4}-\d{2}-\d{2})/);
  const today = new Date().toISOString().slice(0, 10);

  const previousAliases = Object.fromEntries(
    [...existingSource.matchAll(/^ {2}"([\w-]+)": "([^"]+)",$/gm)]
      .slice(Object.keys(selected).length)
      .map((m) => [m[1], m[2]]),
  );
  const { aliases, resolved } = await resolve302Aliases(selected, previousAliases);
  if (!resolved) {
    process.stdout.write("  (302 aliases kept — AI302_API_KEY not set)\n");
  }

  const rendered = renderModule(selected, check ? (existing?.[1] ?? today) : today, aliases);

  let drifted = false;
  for (const target of TARGETS) {
    const full = path.join(REPO_ROOT, target);
    const current = readFileSync(full, "utf8");
    if (current === rendered) continue;
    drifted = true;
    if (!check) writeFileSync(full, rendered);
  }

  for (const [tier, id] of Object.entries(selected)) {
    process.stdout.write(`  ${tier.padEnd(18)} ${id}\n`);
  }

  if (check && drifted) {
    process.stdout.write(
      `\nfrontier-models: the committed fallbacks are not what the gateway routes today.\n` +
        `Run \`pnpm gen:frontier-models\` and commit the result.\n`,
    );
    process.exit(1);
  }

  process.stdout.write(check ? "frontier-models: current\n" : "frontier-models: written\n");
}

// Importable by the parity test without running the generator.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
