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

/**
 * Open-weight families 302.AI serves that the gateway tiers above do not cover.
 *
 * These replaced three SiliconFlow presets that named `Qwen2.5-72B-Instruct`,
 * `DeepSeek-R1` and `DeepSeek-V3` — all long superseded, none with a single
 * caller in the repo, and unverifiable without a SiliconFlow key. 302 fronts
 * the same models and its catalogue is readable, so these are resolved instead
 * of remembered.
 *
 * Ids are 302-native and bare, hence the `302-` key prefix: they are not
 * routable through OpenRouter, which namespaces the same models as `qwen/…`.
 */
const AI302_FAMILIES = {
  "302-deepseek": {
    include: /^deepseek-v\d/,
    // Regional mirrors, dated snapshots, -exp/-terminus previews and the
    // thinking + flash variants are all the same generation under other names.
    exclude: /-(thinking|exp|terminus|flash|huoshan|baidu|aliyun)|-\d{4}/,
  },
  "302-deepseek-fast": {
    include: /^deepseek-v\d.*-flash$/,
    exclude: /-(thinking|exp)/,
  },
  "302-qwen": {
    include: /^qwen3(\.\d+)?-max/,
    exclude: /-preview|-\d{4}-\d{2}-\d{2}/,
  },
  "302-glm": {
    // `glm-4v` / `glm-5v-turbo` are vision; `-air|-airx|-x|-flash|-flashx|
    // -turbo|-long|-plus` are cheaper cuts of the same generation.
    include: /^glm-\d/,
    exclude: /^glm-\d+(\.\d+)?v|-(air|airx|x|flash|flashx|turbo|long|plus|preview|coding)|-\d{6}/,
  },
  "302-kimi": {
    include: /^kimi-k\d/,
    exclude: /-(preview|thinking|turbo|code)|-\d{6}/,
  },
  "302-minimax": {
    // M-series only. H3 shares the version number with M3 and is a separate
    // line, so including it would make the pick a coin toss on sort order.
    include: /^MiniMax-M\d/,
    exclude: /-(highspeed|ir)/,
  },
};

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
async function resolve302Aliases(selected, previous, previousOpen) {
  const key = process.env.AI302_API_KEY;
  if (!key) return { aliases: previous, open: previousOpen, resolved: false };

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

  // Newest member of each open-weight family, by the same version-then-price
  // rule as the gateway tiers (302 exposes no price, so version alone decides;
  // ties fall back to the shorter id, which is the plain variant).
  const open = {};
  for (const [preset, rule] of Object.entries(AI302_FAMILIES)) {
    const candidates = ids.filter((id) => rule.include.test(id) && !rule.exclude.test(id));
    if (candidates.length === 0) {
      throw new Error(
        `[frontier-models] no 302 model matched "${preset}". The family was renamed or ` +
          `the pattern is wrong — a silently missing preset is how a stale id survives.`,
      );
    }
    candidates.sort((a, b) => versionOf(b) - versionOf(a) || a.length - b.length);
    open[preset] = candidates[0];
  }

  return { aliases, open, resolved: true };
}

/** Entries of a single generated `export const NAME = { … }` block. */
function parseBlock(source, name) {
  const match = source.match(new RegExp(`export const ${name}[^=]*= \\{([^}]*)\\}`));
  if (!match?.[1]) return {};
  return Object.fromEntries(
    [...match[1].matchAll(/^ {2}"?([\w-]+)"?: "([^"]+)",$/gm)].map((m) => [m[1], m[2]]),
  );
}

/**
 * Emit an object key the way Biome formats one, so the generated file is a
 * fixed point. Emitting every key quoted made `--check` report drift on a
 * perfectly current file forever, because the pre-commit formatter unquotes the
 * identifier-safe ones — a gate that always fires is a gate people learn to
 * ignore.
 */
const objectKey = (key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${key}"`);

function renderModule(selected, generatedAt, aliases, openModels) {
  const entries = Object.entries(selected)
    .map(([tier, id]) => `  ${objectKey(tier)}: "${id}",`)
    .join("\n");
  const aliasEntries = Object.entries(aliases)
    .map(([tier, id]) => `  ${objectKey(tier)}: "${id}",`)
    .join("\n");
  const openEntries = Object.entries(openModels)
    .map(([preset, id]) => `  ${objectKey(preset)}: "${id}",`)
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

/**
 * Newest member of each open-weight family 302.AI serves — the models the
 * Anthropic/OpenAI/Google tiers above do not cover. Ids are 302-native and bare,
 * so these presets only resolve against the \`ai302\` provider.
 */
export const AI302_OPEN_MODELS = {
${openEntries}
} as const;
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

  // Parse each export block by name. An earlier version matched every entry in
  // the file and sliced by count, which silently folded the open-model block
  // into the alias map the moment a second generated export appeared.
  const previousAliases = parseBlock(existingSource, "AI302_ALIASES");
  const previousOpen = parseBlock(existingSource, "AI302_OPEN_MODELS");

  const { aliases, open, resolved } = await resolve302Aliases(
    selected,
    previousAliases,
    previousOpen,
  );
  if (!resolved) {
    process.stdout.write("  (302 aliases kept — AI302_API_KEY not set)\n");
  }

  const rendered = renderModule(selected, check ? (existing?.[1] ?? today) : today, aliases, open);

  let drifted = false;
  for (const target of TARGETS) {
    const full = path.join(REPO_ROOT, target);
    const current = readFileSync(full, "utf8");
    if (current === rendered) continue;
    drifted = true;
    if (!check) writeFileSync(full, rendered);
  }

  for (const [tier, id] of Object.entries({ ...selected, ...open })) {
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
