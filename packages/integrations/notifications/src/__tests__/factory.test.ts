import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeNotificationProvider,
  createNotification,
  createNotificationProvider,
} from "../factory";

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

  it("passes direct retry and delivery observer config through the factory", async () => {
    const attempts: Array<{ attempt: number; sent: boolean }> = [];
    let calls = 0;
    const provider = await createNotificationProvider({
      provider: "direct",
      maxRetries: 1,
      deliveryObserver: {
        recordAttempt(attempt) {
          attempts.push({ attempt: attempt.attempt, sent: attempt.result.sent });
        },
      },
      emailDispatcher: {
        async send() {
          calls += 1;
          return calls === 1
            ? { sent: false, messageId: "", error: "temporary provider outage" }
            : { sent: true, messageId: "msg_recovered" };
        },
      },
    });

    const result = await provider.send(
      createNotification(
        "workspace.invitation",
        "user_retry",
        ["email"],
        {
          email: "retry@example.com",
          subject: "Invite",
          body: "Join the workspace",
        },
        "tenant_retry",
      ),
    );

    expect(result.accepted).toBe(true);
    expect(calls).toBe(2);
    expect(attempts).toEqual([
      { attempt: 1, sent: false },
      { attempt: 2, sent: true },
    ]);
  });
});
