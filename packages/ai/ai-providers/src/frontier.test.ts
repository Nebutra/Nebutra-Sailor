import { describe, expect, it } from "vitest";
import {
  AGENT_MODEL_PRESETS,
  DEFAULT_PREFIXED_MODEL,
  DEFAULT_PUBLIC_MODEL,
  FRONTIER,
  FRONTIER_TIER_FALLBACK,
  findByBare,
  ROUTER_PUBLIC_MODEL_IDS,
  toBareModelId,
  toCliModelToken,
  toPrefixedModelId,
} from "./frontier";

describe("frontier SSOT", () => {
  it("exposes a non-empty router catalog and default", () => {
    expect(ROUTER_PUBLIC_MODEL_IDS.length).toBeGreaterThan(5);
    expect(ROUTER_PUBLIC_MODEL_IDS).toContain(DEFAULT_PUBLIC_MODEL);
    expect(DEFAULT_PUBLIC_MODEL).toBe(FRONTIER.default.bare);
    expect(DEFAULT_PREFIXED_MODEL).toBe(FRONTIER.default.prefixed);
  });

  it("maps agent presets to prefixed ids", () => {
    expect(AGENT_MODEL_PRESETS.flagship).toContain("/");
    expect(AGENT_MODEL_PRESETS.flagship).toBe(FRONTIER.anthropicFlagship.prefixed);
    expect(FRONTIER_TIER_FALLBACK.flagship).toBe(AGENT_MODEL_PRESETS.flagship);
  });

  it("resolves bare ↔ prefixed helpers", () => {
    expect(toBareModelId("openai/gpt-5.6-luna")).toBe("gpt-5.6-luna");
    expect(toPrefixedModelId("claude-sonnet-5")).toBe("anthropic/claude-sonnet-5");
    expect(toCliModelToken(DEFAULT_PUBLIC_MODEL)).toMatch(/:/);
    expect(findByBare(DEFAULT_PUBLIC_MODEL)?.label).toBeTruthy();
  });

  it("does not ship retired bare ids on the public catalog", () => {
    const set = new Set(ROUTER_PUBLIC_MODEL_IDS);
    for (const retired of [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5.4-mini",
      "gpt-5.5",
      "claude-sonnet-4.6",
      "gemini-3.5-flash",
    ]) {
      expect(set.has(retired)).toBe(false);
    }
  });
});
