import { afterEach, describe, expect, it, vi } from "vitest";
import { createQStashWebhookHandler } from "./qstash-verify.js";

describe("createQStashWebhookHandler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed in production when QStash signing keys are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");

    const handler = createQStashWebhookHandler();
    const res = await handler(
      new Request("https://api.nebutra.test/api/queue/email/send", {
        method: "POST",
        body: JSON.stringify({
          id: "job_1",
          queue: "email",
          type: "send",
          data: {},
          createdAt: new Date().toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("QStash signing keys not configured");
  });
});
