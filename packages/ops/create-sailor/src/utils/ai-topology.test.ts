import { describe, expect, it } from "vitest";
import { resolveAiTopology } from "./ai-topology";

describe("AI topology resolution", () => {
  it("uses gateway as the interactive default without requiring provider-by-provider selection", () => {
    const selection = resolveAiTopology({ mode: "gateway" });

    expect(selection.mode).toBe("gateway");
    expect(selection.providerIds).toEqual(["openai", "anthropic", "google"]);
    expect(selection.routing?.runtimeGovernance).toBe(true);
  });

  it("preserves expert provider seeds passed through --ai", () => {
    const selection = resolveAiTopology({
      mode: "direct",
      providerIds: ["deepseek", "qwen"],
    });

    expect(selection.mode).toBe("direct");
    expect(selection.providerIds).toEqual(["deepseek", "qwen"]);
  });

  it("keeps custom endpoint topology separate from provider seeds", () => {
    const selection = resolveAiTopology({ mode: "custom" });

    expect(selection.mode).toBe("custom");
    expect(selection.providerIds).toEqual([]);
  });
});
