import { describe, expect, it, vi } from "vitest";
import type { AnthropicProviderOptions, OpenAIResponsesProviderOptions } from "../model-tier";
import { buildStartupEffortProviderOptions, selectStartupModelTier } from "../model-tier";

// ─── A. selectStartupModelTier (pure classifier, exhaustive rule matrix) ──────

describe("selectStartupModelTier", () => {
  it("RULE 1: retry-after-failure wins over an otherwise-fast keyword", () => {
    expect(
      selectStartupModelTier({ instruction: "rename button", isRetryAfterFailure: true }),
    ).toEqual({ tier: "reasoning", effort: "high", reason: "retry-after-failure" });
  });

  it("RULE 2: fileCount>5 escalates to reasoning/high; fileCount===5 does NOT", () => {
    expect(selectStartupModelTier({ instruction: "update copy", fileCount: 6 })).toEqual({
      tier: "reasoning",
      effort: "high",
      reason: "file-count>5",
    });

    // Boundary: exactly 5 files must not trip the scope rule → default-fast.
    expect(selectStartupModelTier({ instruction: "update copy", fileCount: 5 })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "default-fast",
    });
  });

  it("RULE 3: instruction>800 tokens escalates; exactly 800 does NOT", () => {
    const longInstruction = Array.from({ length: 801 }, () => "word").join(" ");
    expect(selectStartupModelTier({ instruction: longInstruction })).toEqual({
      tier: "reasoning",
      effort: "high",
      reason: "instruction>800-tokens",
    });

    // Boundary: exactly 800 words falls through to default-fast.
    const boundaryInstruction = Array.from({ length: 800 }, () => "word").join(" ");
    expect(selectStartupModelTier({ instruction: boundaryInstruction })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "default-fast",
    });
  });

  it("RULE 4: reasoning keyword → reasoning/medium with firstMatch in reason", () => {
    expect(selectStartupModelTier({ instruction: "refactor the routing layer" })).toEqual({
      tier: "reasoning",
      effort: "medium",
      reason: "reasoning-keyword:refactor",
    });

    const multiWord = selectStartupModelTier({ instruction: "explain why this fails" });
    expect(multiWord.tier).toBe("reasoning");
    expect(multiWord.effort).toBe("medium");
    expect(multiWord.reason).toContain("explain why");
  });

  it("RULE 5: trivial fast keyword (short, fc<=1) → fast/low with firstMatch", () => {
    expect(selectStartupModelTier({ instruction: "fix typo in header", fileCount: 1 })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "fast-keyword:typo",
    });

    // Boundary: same keyword but fileCount:2 fails the fc<=1 guard → default-fast.
    expect(selectStartupModelTier({ instruction: "fix typo in header", fileCount: 2 })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "default-fast",
    });
  });

  it("RULE 6: unclassified short instruction → default-fast", () => {
    expect(
      selectStartupModelTier({ instruction: "make the hero more compelling", fileCount: 1 }),
    ).toEqual({ tier: "fast", effort: "low", reason: "default-fast" });
  });

  it("is deterministic and env/Date-independent", () => {
    const signals = { instruction: "refactor the routing layer", fileCount: 2 } as const;
    const first = selectStartupModelTier(signals);
    const second = selectStartupModelTier(signals);
    expect(first).toEqual(second);

    // Frozen/empty env must not change the decision (no process.env reads).
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const third = selectStartupModelTier(signals);
    vi.unstubAllEnvs();
    expect(third).toEqual(first);
  });

  it("handles empty / whitespace instruction without throwing → default-fast", () => {
    expect(selectStartupModelTier({ instruction: "" })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "default-fast",
    });
    expect(selectStartupModelTier({ instruction: "   \n  " })).toEqual({
      tier: "fast",
      effort: "low",
      reason: "default-fast",
    });
  });
});

// ─── B. buildStartupEffortProviderOptions (pure providerOptions builder) ──────

describe("buildStartupEffortProviderOptions", () => {
  it("returns the exact shape for low/medium/high", () => {
    expect(buildStartupEffortProviderOptions("low")).toEqual({
      anthropic: { thinking: { type: "adaptive" }, effort: "low" },
      openai: { reasoningEffort: "low" },
    });
    expect(buildStartupEffortProviderOptions("medium")).toEqual({
      anthropic: { thinking: { type: "adaptive" }, effort: "medium" },
      openai: { reasoningEffort: "medium" },
    });
    expect(buildStartupEffortProviderOptions("high")).toEqual({
      anthropic: { thinking: { type: "adaptive" }, effort: "high" },
      openai: { reasoningEffort: "high" },
    });
  });

  it("always returns BOTH provider namespaces (provider-agnostic dispatch)", () => {
    for (const effort of ["low", "medium", "high"] as const) {
      const result = buildStartupEffortProviderOptions(effort);
      expect("anthropic" in result).toBe(true);
      expect("openai" in result).toBe(true);
    }
  });

  it("places effort at the top level of the anthropic namespace, NOT inside thinking", () => {
    const result = buildStartupEffortProviderOptions("high");
    expect(result.anthropic.effort).toBe("high");
    expect(Object.hasOwn(result.anthropic.thinking, "effort")).toBe(false);
    expect(result.anthropic.thinking).toEqual({ type: "adaptive" });
  });

  it("type-guards against SDK provider-option drift (compile-time)", () => {
    const result = buildStartupEffortProviderOptions("medium");
    // satisfies fails typecheck if the installed @ai-sdk shapes drift.
    const anthropic = result.anthropic satisfies AnthropicProviderOptions;
    const openai = result.openai satisfies OpenAIResponsesProviderOptions;
    expect(anthropic.effort).toBe("medium");
    expect(openai.reasoningEffort).toBe("medium");
  });
});
