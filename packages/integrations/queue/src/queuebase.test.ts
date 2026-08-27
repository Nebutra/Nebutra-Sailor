import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createJobClient,
  createJobRouter,
  createQueuebaseWebhookHandler,
  defineQueueJob,
  listQueuebaseSchedules,
} from "./queuebase";
import type { QueueProvider } from "./types";

const makeQueue = () => {
  const enqueue = vi
    .fn()
    .mockResolvedValue({ jobId: "provider-job-1", accepted: true, provider: "memory" });
  return {
    name: "memory",
    enqueue,
    enqueueBatch: vi.fn(),
    registerHandler: vi.fn(),
    close: vi.fn(),
  } as unknown as QueueProvider & { enqueue: typeof enqueue };
};

describe("Queuebase-style typed jobs", () => {
  it("validates inputs before enqueueing a typed job", async () => {
    const queue = makeQueue();
    const jobs = createJobRouter({
      sendWelcomeEmail: defineQueueJob({
        input: z.object({ to: z.string().email(), name: z.string().min(1) }),
        handler: async () => ({ sent: true }),
        defaults: { retries: 2, backoff: "exponential" },
      }),
    });
    const client = createJobClient(jobs, {
      callbackUrl: "https://app.nebutra.com/api/webhooks/queuebase",
      queue,
    });

    await expect(
      client.sendWelcomeEmail.enqueue({ to: "not-an-email", name: "Ada" }),
    ).rejects.toThrow(/Invalid input for job sendWelcomeEmail/);
    expect(queue.enqueue).not.toHaveBeenCalled();

    const result = await client.sendWelcomeEmail.enqueue({ to: "ada@example.com", name: "Ada" });
    expect(result).toEqual({
      jobId: "provider-job-1",
      accepted: true,
      provider: "memory",
      jobName: "sendWelcomeEmail",
      callbackUrl: "https://app.nebutra.com/api/webhooks/queuebase",
    });
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: "queuebase",
        type: "sendWelcomeEmail",
        data: { to: "ada@example.com", name: "Ada" },
        options: expect.objectContaining({
          maxRetries: 2,
          metadata: expect.objectContaining({
            queuebaseJobName: "sendWelcomeEmail",
            callbackUrl: "https://app.nebutra.com/api/webhooks/queuebase",
            backoff: "exponential",
          }),
        }),
      }),
    );
  });

  it("dispatches callback webhooks through the matching validated handler", async () => {
    const handler = vi.fn().mockResolvedValue({ sent: true });
    const jobs = createJobRouter({
      sendWelcomeEmail: defineQueueJob({
        input: z.object({ to: z.string().email(), name: z.string() }),
        handler,
      }),
    });
    const webhook = createQueuebaseWebhookHandler(jobs);

    const res = await webhook(
      new Request("https://app.nebutra.com/api/webhooks/queuebase", {
        method: "POST",
        body: JSON.stringify({
          jobName: "sendWelcomeEmail",
          input: { to: "ada@example.com", name: "Ada" },
          jobId: "qb_123",
          attempt: 2,
          maxAttempts: 3,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      jobName: "sendWelcomeEmail",
      result: { sent: true },
    });
    expect(handler).toHaveBeenCalledWith({
      input: { to: "ada@example.com", name: "Ada" },
      jobId: "qb_123",
      attempt: 2,
      maxAttempts: 3,
      fail: expect.any(Function),
    });
  });

  it("rejects callbacks with an invalid Queuebase webhook signature", async () => {
    const handler = vi.fn();
    const jobs = createJobRouter({
      sendWelcomeEmail: defineQueueJob({
        input: z.object({ to: z.string().email() }),
        handler,
      }),
    });
    const webhook = createQueuebaseWebhookHandler(jobs, { webhookSecret: "secret_123" });
    const body = JSON.stringify({
      jobName: "sendWelcomeEmail",
      input: { to: "ada@example.com" },
    });

    const invalid = await webhook(
      new Request("https://app.nebutra.com/api/webhooks/queuebase", {
        method: "POST",
        headers: { "x-queuebase-signature": "sha256=invalid" },
        body,
      }),
    );

    expect(invalid.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();

    const signature = createHmac("sha256", "secret_123").update(body).digest("hex");
    const valid = await webhook(
      new Request("https://app.nebutra.com/api/webhooks/queuebase", {
        method: "POST",
        headers: { "x-queuebase-signature": `sha256=${signature}` },
        body,
      }),
    );

    expect(valid.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns schedule metadata for sync tooling without executing handlers", () => {
    const handler = vi.fn();
    const jobs = createJobRouter({
      dailyCleanup: defineQueueJob({
        input: z.object({}),
        schedule: { cron: "every day at 2am", timezone: "UTC", overlap: "skip" },
        handler,
      }),
    });

    expect(listQueuebaseSchedules(jobs)).toEqual([
      {
        name: "dailyCleanup",
        schedule: { cron: "every day at 2am", timezone: "UTC", overlap: "skip" },
      },
    ]);
    expect(handler).not.toHaveBeenCalled();
  });
});
