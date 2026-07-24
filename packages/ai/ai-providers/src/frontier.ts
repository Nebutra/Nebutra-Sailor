/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FRONTIER MODEL REGISTRY — single source of truth (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Update **this file only** when the industry catalog moves. Every product
 * surface (Router defaults, agents presets, Forge price card, gateway sample
 * models, docs examples that import from here) should derive ids from this
 * module — do not hand-type bare model strings in apps.
 *
 * Audit: 2026-07-24 vs OpenRouter live `/api/v1/models`
 * Prices: OpenRouter list rates USD / 1M tokens (prompt/completion × 1e6)
 *
 * Id shapes:
 *   - `bare`     → Router public face (`/v1/models`, client `model` field)
 *   - `prefixed` → OpenRouter / agents (`provider/model`)
 */

export type FrontierProvider = "openai" | "anthropic" | "google" | "deepseek";

export interface FrontierModelDef {
  /** Bare public id (Router / cost UI). */
  readonly bare: string;
  /** Prefixed id for OpenRouter / @nebutra/agents. */
  readonly prefixed: string;
  readonly provider: FrontierProvider;
  readonly label: string;
  /** List-price ballpark; not billing SSOT. */
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
}

/**
 * Named slots — semantic roles, not version numbers.
 * When a generation ships, change the *values* here; keep slot keys stable.
 */
export const FRONTIER = {
  /** Product default when the client omits `model`. */
  default: {
    bare: "gpt-5.6-luna",
    prefixed: "openai/gpt-5.6-luna",
    provider: "openai",
    label: "OpenAI GPT-5.6 Luna",
    inputPerMTok: 1,
    outputPerMTok: 6,
  },
  openaiWorkhorse: {
    bare: "gpt-5.6-luna",
    prefixed: "openai/gpt-5.6-luna",
    provider: "openai",
    label: "OpenAI GPT-5.6 Luna",
    inputPerMTok: 1,
    outputPerMTok: 6,
  },
  openaiMid: {
    bare: "gpt-5.6-terra",
    prefixed: "openai/gpt-5.6-terra",
    provider: "openai",
    label: "OpenAI GPT-5.6 Terra",
    inputPerMTok: 2.5,
    outputPerMTok: 15,
  },
  openaiFlagship: {
    bare: "gpt-5.6-sol",
    prefixed: "openai/gpt-5.6-sol",
    provider: "openai",
    label: "OpenAI GPT-5.6 Sol",
    inputPerMTok: 5,
    outputPerMTok: 30,
  },
  anthropicFlagship: {
    bare: "claude-sonnet-5",
    prefixed: "anthropic/claude-sonnet-5",
    provider: "anthropic",
    label: "Anthropic Claude Sonnet 5",
    inputPerMTok: 2,
    outputPerMTok: 10,
  },
  anthropicReasoning: {
    bare: "claude-fable-5",
    prefixed: "anthropic/claude-fable-5",
    provider: "anthropic",
    label: "Anthropic Claude Fable 5",
    inputPerMTok: 10,
    outputPerMTok: 50,
  },
  anthropicOpus: {
    bare: "claude-opus-4.8",
    prefixed: "anthropic/claude-opus-4.8",
    provider: "anthropic",
    label: "Anthropic Claude Opus 4.8",
    inputPerMTok: 5,
    outputPerMTok: 25,
  },
  anthropicFast: {
    bare: "claude-haiku-4.5",
    prefixed: "anthropic/claude-haiku-4.5",
    provider: "anthropic",
    label: "Anthropic Claude Haiku 4.5",
    inputPerMTok: 1,
    outputPerMTok: 5,
  },
  googleFlagship: {
    bare: "gemini-3.1-pro",
    prefixed: "google/gemini-3.1-pro-preview",
    provider: "google",
    label: "Google Gemini 3.1 Pro",
    inputPerMTok: 2,
    outputPerMTok: 12,
  },
  googleFast: {
    bare: "gemini-3.6-flash",
    prefixed: "google/gemini-3.6-flash",
    provider: "google",
    label: "Google Gemini 3.6 Flash",
    inputPerMTok: 1.5,
    outputPerMTok: 7.5,
  },
  deepseekFast: {
    bare: "deepseek-v4-flash",
    prefixed: "deepseek/deepseek-v4-flash",
    provider: "deepseek",
    label: "DeepSeek V4 Flash",
    inputPerMTok: 0.098,
    outputPerMTok: 0.196,
  },
  deepseekPro: {
    bare: "deepseek-v4-pro",
    prefixed: "deepseek/deepseek-v4-pro",
    provider: "deepseek",
    label: "DeepSeek V4 Pro",
    inputPerMTok: 0.435,
    outputPerMTok: 0.87,
  },
} as const satisfies Record<string, FrontierModelDef>;

export type FrontierSlot = keyof typeof FRONTIER;

/** Bare id when client omits model (Router, gateway demo defaults). */
export const DEFAULT_PUBLIC_MODEL: string = FRONTIER.default.bare;

/** Prefixed id for agents / OpenRouter when config omits model. */
export const DEFAULT_PREFIXED_MODEL: string = FRONTIER.default.prefixed;

/**
 * Offline fallbacks for `resolveFrontierModel(tier)` / ModelTier.
 * Prefixed OpenRouter-style ids.
 */
export const FRONTIER_TIER_FALLBACK = {
  reasoning: FRONTIER.anthropicReasoning.prefixed,
  flagship: FRONTIER.anthropicFlagship.prefixed,
  fast: FRONTIER.anthropicFast.prefixed,
  "openai-flagship": FRONTIER.openaiFlagship.prefixed,
  "google-flagship": FRONTIER.googleFlagship.prefixed,
  "google-fast": FRONTIER.googleFast.prefixed,
} as const;

/** @deprecated Use FRONTIER_TIER_FALLBACK — kept as alias for existing imports. */
export const FRONTIER_FALLBACK = FRONTIER_TIER_FALLBACK;

/**
 * Ordered bare public catalog for Router alias table / Forge cost UI.
 * Deduped (default and openaiWorkhorse share the same bare id).
 */
export const ROUTER_PUBLIC_MODEL_IDS: readonly string[] = uniqueBare([
  FRONTIER.default,
  FRONTIER.openaiMid,
  FRONTIER.openaiFlagship,
  FRONTIER.anthropicFlagship,
  FRONTIER.anthropicReasoning,
  FRONTIER.anthropicOpus,
  FRONTIER.anthropicFast,
  FRONTIER.googleFast,
  FRONTIER.googleFlagship,
  FRONTIER.deepseekFast,
  FRONTIER.deepseekPro,
]);

/** Agent SDK preset map (prefixed). Slot names match historical `models.*` keys. */
export const AGENT_MODEL_PRESETS = {
  flagship: FRONTIER.anthropicFlagship.prefixed,
  reasoning: FRONTIER.anthropicReasoning.prefixed,
  fast: FRONTIER.anthropicFast.prefixed,
  "openai-flagship": FRONTIER.openaiFlagship.prefixed,
  "google-flagship": FRONTIER.googleFlagship.prefixed,
  "google-fast": FRONTIER.googleFast.prefixed,
} as const;

/** Forge / docs select options derived from the registry. */
export function frontierSelectOptions(): readonly { value: string; label: string }[] {
  return ROUTER_PUBLIC_MODEL_IDS.map((bare) => {
    const def = findByBare(bare);
    return { value: bare, label: def?.label ?? bare };
  });
}

export function findByBare(bare: string): FrontierModelDef | undefined {
  return Object.values(FRONTIER).find((m) => m.bare === bare);
}

export function findByPrefixed(prefixed: string): FrontierModelDef | undefined {
  return Object.values(FRONTIER).find((m) => m.prefixed === prefixed);
}

export function getFrontier(slot: FrontierSlot): FrontierModelDef {
  return FRONTIER[slot];
}

/** Strip `provider/` prefix if present. */
export function toBareModelId(id: string): string {
  const i = id.indexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

/**
 * Ensure OpenRouter-style prefix. If already prefixed, return as-is.
 * Unknown bare ids get `openai/` only when they look like gpt-*; otherwise left bare.
 */
export function toPrefixedModelId(id: string): string {
  if (id.includes("/")) return id;
  const hit = findByBare(id);
  if (hit) return hit.prefixed;
  if (id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4")) {
    return `openai/${id}`;
  }
  if (id.startsWith("claude-")) return `anthropic/${id}`;
  if (id.startsWith("gemini-")) return `google/${id}`;
  if (id.startsWith("deepseek-")) return `deepseek/${id}`;
  return id;
}

/** CLI / env fallback tokens like `openai:gpt-5.6-luna`. */
export function toCliModelToken(bareOrPrefixed: string): string {
  const bare = toBareModelId(bareOrPrefixed);
  const def = findByBare(bare);
  const provider = def?.provider ?? "openai";
  return `${provider}:${bare}`;
}

function uniqueBare(defs: readonly FrontierModelDef[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of defs) {
    if (seen.has(d.bare)) continue;
    seen.add(d.bare);
    out.push(d.bare);
  }
  return out;
}
