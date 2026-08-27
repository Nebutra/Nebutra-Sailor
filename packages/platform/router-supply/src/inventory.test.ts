import { describe, expect, it } from "vitest";
import { bareModelId, inventoryHas, modelsListUrl, type SupplyInventory } from "./inventory";

describe("modelsListUrl", () => {
  it("normalizes base paths", () => {
    expect(modelsListUrl("http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001/v1/models");
    expect(modelsListUrl("http://127.0.0.1:3001/v1")).toBe("http://127.0.0.1:3001/v1/models");
    expect(modelsListUrl("http://127.0.0.1:3001/v1/")).toBe("http://127.0.0.1:3001/v1/models");
  });
});

describe("inventoryHas", () => {
  const inv: SupplyInventory = {
    ids: new Set(["openai/gpt-5.6-sol", "gpt-5.6-sol", "gpt-5-6-sol", "claude-sonnet-5"]),
    sources: ["openrouter(1)"],
    ok: true,
    fetchedAt: Date.now(),
    note: "test",
  };

  it("matches full and bare ids", () => {
    expect(inventoryHas(inv, "gpt-5.6-sol")).toBe(true);
    expect(inventoryHas(inv, "openai/gpt-5.6-sol")).toBe(true);
  });

  it("matches normalized separators", () => {
    expect(inventoryHas(inv, "claude-sonnet-5")).toBe(true);
  });

  it("rejects unknown", () => {
    expect(inventoryHas(inv, "totally-fake-model")).toBe(false);
  });
});

describe("bareModelId", () => {
  it("strips provider prefix", () => {
    expect(bareModelId("openai/gpt-5.6-sol")).toBe("gpt-5.6-sol");
    expect(bareModelId("gpt-5.6-sol")).toBe("gpt-5.6-sol");
  });
});
