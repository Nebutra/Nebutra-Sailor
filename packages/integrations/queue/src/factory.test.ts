import { afterEach, describe, expect, it, vi } from "vitest";
import { closeQueue, createQueue } from "./factory";

describe("queue provider factory", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await closeQueue();
  });

  it("fails closed in production when no durable queue provider is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_TOKEN", "");
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("QUEUE_PROVIDER", "");

    await expect(createQueue()).rejects.toThrow(
      "Refusing to use the in-memory queue provider in production",
    );
  });

  it("requires an explicit escape hatch for memory queues in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QUEUE_PROVIDER", "memory");

    await expect(createQueue()).rejects.toThrow(
      "Refusing to use the in-memory queue provider in production",
    );

    vi.stubEnv("ALLOW_MEMORY_QUEUE_IN_PRODUCTION", "true");
    await expect(createQueue()).resolves.toMatchObject({ name: "memory" });
  });
});
