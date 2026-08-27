/**
 * Thinking-effort / model-tier routing for the Startup Agent OS coding agent.
 *
 * PURE module — no LLM, no env, no Date, no Math.random, no I/O. Both exported
 * functions are deterministic (same input → same output) so the entire rule
 * matrix is keyless-testable. The decision to ROUTE at all (vs. legacy
 * always-fast behavior) belongs to the CALLER via startup-os/feature-flag.ts —
 * this module stays flag-free so it can be unit-tested in isolation.
 *
 * The builder's return type is a hand-written interface so this file has ZERO
 * runtime import from the AI SDK (keeps it pure/keyless). The `satisfies` checks
 * against the SDK provider-option types live only as compile-time guards via
 * the type-only imports below.
 */

// Type-only imports — erased at runtime, so this module imports NOTHING at
// runtime. Re-exported for the compile-time drift guard in the test suite.
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import type { JSONObject } from "@ai-sdk/provider";

export type { AnthropicProviderOptions, OpenAIResponsesProviderOptions };

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Maps 1:1 to existing preset aliases in @nebutra/agents sdk/models.ts
 * (fast=haiku, reasoning=opus). flagship(sonnet) is intentionally NOT used —
 * a binary cascade keeps the contract simple; the promotion path can add a
 * third tier later once calibration data justifies it.
 */
export type StartupModelTier = "fast" | "reasoning";

export type StartupEffortLevel = "low" | "medium" | "high";

export interface StartupTierSignals {
  /**
   * Founder instruction / run prompt seed — NOT the giant JSON workspace prompt
   * from buildStartupRunPrompt()/buildStartupConversationPrompt(). Those embed
   * full file contents, so a token-length heuristic would always trip the
   * >800-token reasoning gate. Callers pass the raw free-text instruction (or,
   * for execution.ts, a synthetic instruction derived from stage + artifact
   * titles).
   */
  readonly instruction: string;
  /** Editable workspace file count in scope (input.files?.length ?? 0). */
  readonly fileCount?: number;
  /** True when this is a retry of a previously failed run/turn. */
  readonly isRetryAfterFailure?: boolean;
}

export interface StartupTierDecision {
  /** → runWithFallback({ model: tier }) */
  readonly tier: StartupModelTier;
  /** → forwarded via buildStartupEffortProviderOptions(effort) */
  readonly effort: StartupEffortLevel;
  /** Which rule fired — for telemetry / threshold calibration + test assertions. */
  readonly reason: string;
}

/**
 * Hand-written return shape for the providerOptions builder. Deliberately NOT
 * the SDK type, so model-tier.ts has zero runtime SDK import. The `satisfies`
 * guards in buildStartupEffortProviderOptions assert this shape stays
 * assignable to the live SDK provider-option types.
 *
 * Properties are intentionally NOT marked `readonly`: the AI SDK's top-level
 * `providerOptions` field is typed `Record<string, JSONObject>` (a mutable
 * index signature), and a `readonly`-property object is not assignable to it.
 * Immutability is preserved by construction — the builder returns a fresh
 * literal on every call and never mutates a shared instance.
 */
export interface StartupEffortProviderOptions {
  anthropic: {
    thinking: { type: "adaptive" };
    effort: StartupEffortLevel;
  };
  openai: {
    reasoningEffort: StartupEffortLevel;
  };
}

// ─── Classifier thresholds & keyword sets ───────────────────────────────────────
//
// Thresholds (80 / 800 / fc>5) are the research's verified hard signals.
// Calibrate after 500+ production routing decisions — RouterArena finds current
// routers over-use the strong tier, so monitor escalation_rate and
// fast_tier_success_rate via the `reason` metadata now emitted in events.

const TRIVIAL_TOKEN_CEILING = 80; // RULE 5 — below this an instruction is trivially short.
const REASONING_TOKEN_FLOOR = 800; // RULE 3 — above this an instruction is architectural.
const REASONING_FILE_CEILING = 5; // RULE 2 — more than this many files = multi-file scope.

const REASONING_KEYWORDS: readonly string[] = [
  "refactor",
  "architect",
  "design",
  "debug",
  "trace",
  "explain why",
  "migrate",
  "restructure",
  "analyse",
  "analyze",
  "governance",
  "compliance",
  "rearchitect",
];

const FAST_KEYWORDS: readonly string[] = [
  "rename",
  "typo",
  "format",
  "add import",
  "update import",
  "add comment",
  "fix whitespace",
  "move file",
  "tweak",
  "copy edit",
  "reword",
];

/** Word-count proxy — matches the research's `len(instruction.split())`. */
function countTokens(instruction: string): number {
  return instruction.trim().split(/\s+/).filter(Boolean).length;
}

/** First keyword (in declaration order) whose substring appears in `lower`. */
function firstKeywordMatch(lower: string, keywords: readonly string[]): string | undefined {
  return keywords.find((keyword) => lower.includes(keyword));
}

// ─── (a) Pure classifier ────────────────────────────────────────────────────────

/**
 * Deterministic, side-effect-free tier/effort classifier. Rules evaluate in a
 * fixed order; the FIRST match wins. The `reason` string records which rule
 * fired for calibration and exact test assertions.
 */
export function selectStartupModelTier(signals: StartupTierSignals): StartupTierDecision {
  const tokenCount = countTokens(signals.instruction);
  const lower = signals.instruction.toLowerCase();
  const fc = signals.fileCount ?? 0;

  // RULE 1 — HARD REASONING (retry): a previous failure is the single strongest
  // escalation signal; spend max effort on the second attempt.
  if (signals.isRetryAfterFailure === true) {
    return { tier: "reasoning", effort: "high", reason: "retry-after-failure" };
  }

  // RULE 2 — HARD REASONING (scope): multi-file scope is architectural.
  if (fc > REASONING_FILE_CEILING) {
    return { tier: "reasoning", effort: "high", reason: "file-count>5" };
  }

  // RULE 3 — HARD REASONING (length): a long instruction implies a complex task.
  if (tokenCount > REASONING_TOKEN_FLOOR) {
    return { tier: "reasoning", effort: "high", reason: "instruction>800-tokens" };
  }

  // RULE 4 — HARD REASONING (keyword): medium (not high) — a keyword alone is a
  // weaker signal than retry/scope/length; calibrate later.
  const reasoningKeyword = firstKeywordMatch(lower, REASONING_KEYWORDS);
  if (reasoningKeyword) {
    return {
      tier: "reasoning",
      effort: "medium",
      reason: `reasoning-keyword:${reasoningKeyword}`,
    };
  }

  // RULE 5 — HARD FAST (trivial): short + single-file + an explicit trivial verb.
  if (tokenCount < TRIVIAL_TOKEN_CEILING && fc <= 1) {
    const fastKeyword = firstKeywordMatch(lower, FAST_KEYWORDS);
    if (fastKeyword) {
      return { tier: "fast", effort: "low", reason: `fast-keyword:${fastKeyword}` };
    }
  }

  // RULE 6 — DEFAULT: err toward trying the fast tier first (RouterArena). This
  // preserves the pre-existing always-"fast" behavior for unclassified tasks.
  return { tier: "fast", effort: "low", reason: "default-fast" };
}

// ─── (b) Pure providerOptions builder ───────────────────────────────────────────

/**
 * Builds a top-level `providerOptions` object carrying the chosen thinking
 * effort for BOTH provider namespaces in one literal. runWithFallback walks
 * anthropic→openai→openrouter; only the ACTIVE provider's namespace is applied
 * and the rest are silently ignored — which is exactly what makes this same
 * object correct regardless of which fallback provider wins.
 *
 * Anthropic uses ADAPTIVE thinking with a SIBLING top-level `effort` field
 * (NOT nested inside `thinking`). OpenAI uses `reasoningEffort` with the
 * identical low|medium|high values. No reasoningSummary — startup-os parses
 * strict JSON, not reasoning traces.
 *
 * NOTE on merging with cache-control: fallback.ts puts
 * `{ anthropic: { cacheControl } }` on the SYSTEM MESSAGE (message-level
 * providerOptions); effort lives at the TOP-LEVEL call providerOptions. They
 * sit at different levels, so there is no collision. If a caller later wants
 * cache-control at the call level too, deep-merge the anthropic namespace:
 * `{ ...effortOpts.anthropic, cacheControl: {...} }`.
 */
export function buildStartupEffortProviderOptions(
  effort: StartupEffortLevel,
): StartupEffortProviderOptions & Record<string, JSONObject> {
  // satisfies (not annotation) keeps the precise inferred shape while asserting
  // assignability to the live SDK provider-option types — fails typecheck if
  // those shapes drift. The intersection in the return type makes the result
  // assignable to the AI SDK's `providerOptions` (Record<string, JSONObject>)
  // without losing the precise named-key typing used by tests/callers.
  const anthropic = {
    thinking: { type: "adaptive" },
    effort,
  } satisfies AnthropicProviderOptions;

  const openai = {
    reasoningEffort: effort,
  } satisfies OpenAIResponsesProviderOptions;

  return { anthropic, openai };
}
