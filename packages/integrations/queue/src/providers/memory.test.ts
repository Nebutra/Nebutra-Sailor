import { afterEach, describe, expect, it, vi } from "vitest";
import { createJob } from "../factory";
import { MemoryProvider } from "./memory";

describe("MemoryProvider dead-letter handling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves exhausted jobs to an observable dead-letter queue with retry metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T08:00:00.000Z"));

    const queue = new MemoryProvider();
    const job = createJob("email", "send", { to: "ops@example.com" }, { maxRetries: 2 });

    queue.registerHandler("email", "send", async () => {
      throw new Error("smtp unavailable");
    });

    await queue.enqueue(job);
    await vi.runAllTimersAsync();

    const status = await queue.getJobStatus(job.id, "email");
    const deadLetters = await queue.getDeadLetteredJobs("email");

    expect(status).toMatchObject({
      id: job.id,
      queue: "email",
      status: "dead-lettered",
      attempts: 2,
      maxRetries: 2,
      failedReason: "smtp unavailable",
    });
    expect(status?.deadLetteredAt).toBe("2026-04-29T08:00:00.000Z");

    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({
      id: job.id,
      queue: "email",
      type: "send",
      originalJob: job,
      attempts: 2,
      maxRetries: 2,
      failedReason: "smtp unavailable",
      provider: "memory",
      failedAt: "2026-04-29T08:00:00.000Z",
    });

    await queue.close();
  });
});
