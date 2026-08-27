import { afterEach, describe, expect, it, vi } from "vitest";
import { closeWebhooks, createWebhooks } from "./factory";

describe("webhook provider factory", () => {
  afterEach(async () => {
    await closeWebhooks();
    vi.unstubAllEnvs();
  });

  it("fails closed in production when custom provider would use process-local memory", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_PROVIDER", "custom");
    vi.stubEnv("ALLOW_MEMORY_WEBHOOKS_IN_PRODUCTION", "");

    await expect(createWebhooks()).rejects.toThrow(
      /Refusing to use in-memory webhook delivery in production/i,
    );
  });

  it("allows the custom memory provider only with an explicit production escape hatch", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_PROVIDER", "custom");
    vi.stubEnv("ALLOW_MEMORY_WEBHOOKS_IN_PRODUCTION", "true");

    await expect(createWebhooks()).resolves.toMatchObject({ name: "custom" });
  });
});
