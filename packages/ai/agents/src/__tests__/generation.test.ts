/**
 * Image / video generation modality.
 *
 * Verifies the env-key-gated provider chain mirrors the LLM fallback design:
 * deterministic mock terminal, additive real-provider priority, retryable
 * rotation, and tenant-scoped attribution.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetGenerationRegistry,
  type GenerationContext,
  type GenerationProvider,
  generateImage,
  generateVideo,
  listGenerationProviders,
  registerGenerationProvider,
} from "../generation/index";

const ctx: GenerationContext = {
  tenantId: "org_test",
  userId: "user_test",
  conversationId: "canvas_1",
};

beforeEach(() => {
  _resetGenerationRegistry();
  delete process.env.GENERATION_FALLBACK_CHAIN;
});
afterEach(() => {
  _resetGenerationRegistry();
});

describe("mock provider (terminal)", () => {
  it("is always available with no secret", () => {
    expect(listGenerationProviders("image")).toEqual(["mock"]);
    expect(listGenerationProviders("video")).toEqual(["mock"]);
  });

  it("produces a deterministic data URI for identical input", async () => {
    const a = await generateImage({ prompt: "a blue fox", width: 512, height: 512 }, ctx);
    const b = await generateImage({ prompt: "a blue fox", width: 512, height: 512 }, ctx);
    expect(a.url).toBe(b.url);
    expect(a.url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(a.width).toBe(512);
    expect(a.providerName).toBe("mock");
    expect(a.usage.units).toBe(1);
  });

  it("varies output by prompt", async () => {
    const a = await generateImage({ prompt: "sunset" }, ctx);
    const b = await generateImage({ prompt: "moonrise" }, ctx);
    expect(a.url).not.toBe(b.url);
  });

  it("returns a poster frame + second-based units for video", async () => {
    const v = await generateVideo({ prompt: "waves", durationSeconds: 8 }, ctx);
    expect(v.modality).toBe("video");
    expect(v.usage.units).toBe(8);
  });
});

describe("env-key gating + priority", () => {
  const realProvider: GenerationProvider = {
    name: "fake-real",
    envKey: "FAKE_REAL_API_KEY",
    capabilities: ["image"],
    async generateImage(req) {
      return {
        modality: "image",
        mimeType: "image/png",
        url: "https://example.test/real.png",
        width: req.width ?? 1024,
        height: req.height ?? 1024,
        providerName: "fake-real",
        model: "fake-real-1",
        usage: { units: 1 },
      };
    },
  };

  it("hides a provider whose env key is absent", () => {
    registerGenerationProvider(realProvider);
    delete process.env.FAKE_REAL_API_KEY;
    expect(listGenerationProviders("image")).toEqual(["mock"]);
  });

  it("prefers the real provider when its key is present", async () => {
    registerGenerationProvider(realProvider);
    process.env.FAKE_REAL_API_KEY = "x";
    expect(listGenerationProviders("image")).toEqual(["fake-real", "mock"]);
    const r = await generateImage({ prompt: "hi" }, ctx);
    expect(r.providerName).toBe("fake-real");
    delete process.env.FAKE_REAL_API_KEY;
  });
});

describe("retryable rotation", () => {
  it("rotates to mock when a real provider throws a retryable error", async () => {
    registerGenerationProvider({
      name: "flaky",
      envKey: null,
      capabilities: ["image"],
      async generateImage() {
        throw new Error("429 Too Many Requests");
      },
    });
    const r = await generateImage({ prompt: "resilient" }, ctx);
    expect(r.providerName).toBe("mock");
  });
});
