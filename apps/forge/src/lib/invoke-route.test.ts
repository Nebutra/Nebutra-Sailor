import { ForgeRegistry, invokeTool } from "@nebutra/forge-runtime";
import { describe, expect, it } from "vitest";

describe("forge invoke integration (runtime)", () => {
  it("word-count path used by API", async () => {
    const registry = ForgeRegistry.openDefault();
    const result = await invokeTool(registry, {
      toolId: "text/word-count",
      input: { text: "a b c" },
    });
    expect(result.ok).toBe(true);
  });
});
