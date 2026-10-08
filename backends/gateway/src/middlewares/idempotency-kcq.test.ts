/** Credential routes must reauthorize every request, never replay anonymous cache entries. */
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => ({
  get: vi.fn(async () => ({ body: { owner: "other-tenant" }, status: 200, headers: {} })),
}));
vi.mock("@nebutra/cache", () => ({ getRedis: async () => redis }));

import { idempotencyMiddleware } from "./idempotency.js";

describe("KCQ credential reauthorization", () => {
  it("does not serve a cached response before the credential auth guard", async () => {
    const app = new Hono();
    app.use("*", idempotencyMiddleware);
    app.post("/api/v1/kcq/connections", (c) => c.json({ error: "Login required" }, 401));
    const response = await app.request("/api/v1/kcq/connections", {
      method: "POST",
      headers: { "Idempotency-Key": "12345678-1234-4123-8123-123456789012" },
    });
    expect(response.status).toBe(401);
    expect(redis.get).not.toHaveBeenCalled();
  });
});
