import { afterEach, describe, expect, it, vi } from "vitest";
import { closeNotificationProvider, createNotificationProvider } from "../factory";

describe("notification provider factory", () => {
  afterEach(async () => {
    await closeNotificationProvider();
    vi.unstubAllEnvs();
  });

  it("fails closed in production when direct provider would use in-memory stores", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOTIFICATION_PROVIDER", "direct");
    vi.stubEnv("ALLOW_MEMORY_NOTIFICATIONS_IN_PRODUCTION", "");

    await expect(createNotificationProvider()).rejects.toThrow(
      /Refusing to use in-memory notification stores in production/i,
    );
  });

  it("allows direct provider in production only with durable store adapters or explicit escape hatch", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOTIFICATION_PROVIDER", "direct");
    vi.stubEnv("ALLOW_MEMORY_NOTIFICATIONS_IN_PRODUCTION", "true");

    await expect(createNotificationProvider()).resolves.toMatchObject({ name: "direct" });
  });
});
