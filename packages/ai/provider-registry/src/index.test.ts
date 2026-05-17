import { describe, expect, it } from "vitest";
import {
  CapabilityError,
  createLocalModelProvider,
  normalizeProviderMessages,
  ProviderRegistry,
} from "./index";

describe("ProviderRegistry", () => {
  it("returns a zero-config local provider by model id", async () => {
    const registry = ProviderRegistry.default();
    const provider = registry.get("llama3.2");

    expect(provider.id).toBe("local-model");
    expect(provider.model).toBe("llama3.2");
    expect(await provider.doctor()).toMatchObject({
      provider: "local-model",
      ok: expect.any(Boolean),
    });
  });

  it("normalizes system and user messages for provider calls", () => {
    expect(
      normalizeProviderMessages([
        { role: "system", content: "Be terse." },
        { role: "user", content: "Hi" },
      ]),
    ).toEqual([
      { role: "system", content: "Be terse." },
      { role: "user", content: "Hi" },
    ]);
  });

  it("surfaces suggestion-bearing errors for missing providers", () => {
    const registry = new ProviderRegistry();

    expect(() => registry.get("missing-model")).toThrow(CapabilityError);
  });

  it("wraps an injected fetch implementation", async () => {
    const calls: string[] = [];
    const provider = createLocalModelProvider({
      model: "llama3.2",
      fetch: async (url) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ response: "ok" }), { status: 200 });
      },
    });

    await expect(provider.complete([{ role: "user", content: "hi" }])).resolves.toMatchObject({
      text: "ok",
      provider: "local-model",
      model: "llama3.2",
    });
    expect(calls[0]).toContain("/api/generate");
  });
});
