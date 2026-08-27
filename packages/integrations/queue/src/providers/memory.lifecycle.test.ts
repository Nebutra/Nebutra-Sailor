import { describe, expect, it, vi } from "vitest";
import type { JobPayload } from "../types";
import { MemoryProvider } from "./memory";

const makeJob = (overrides: Partial<JobPayload> = {}): JobPayload => ({
  id: "job_lifecycle_1",
  queue: "email",
  type: "send",
  data: { to: "ada@example.com" },
  createdAt: "2026-05-16T08:00:00.000Z",
  ...overrides,
});

describe("MemoryProvider job lifecycle operations", () => {
  it("cancels a delayed job and records inspector log metadata", async () => {
    vi.useFakeTimers();
    const queue = new MemoryProvider();
    const handler = vi.fn(async () => {});
    queue.registerHandler("email", "send", handler);

    const job = makeJob({ options: { delaySec: 60 } });
    await queue.enqueue(job);

    await expect(queue.cancelJob(job.id, job.queue, "operator-request")).resolves.toMatchObject({
      jobId: job.id,
      accepted: true,
      action: "cancel",
    });

    await vi.advanceTimersByTimeAsync(60_000);

    await expect(queue.getJobStatus(job.id, job.queue)).resolves.toMatchObject({
      id: job.id,
      status: "canceled",
      canceledReason: "operator-request",
    });
    await expect(queue.getJobLogs(job.id, job.queue)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "enqueued" }),
        expect.objectContaining({ action: "canceled", reason: "operator-request" }),
      ]),
    );
    expect(handler).not.toHaveBeenCalled();

    await queue.close();
    vi.useRealTimers();
  });

  it("retries a dead-lettered job and preserves retry audit metadata", async () => {
    const queue = new MemoryProvider();
    let shouldFail = true;
    queue.registerHandler("email", "send", async () => {
      if (shouldFail) throw new Error("smtp down");
    });

    const job = makeJob({ id: "job_retry_1", options: { maxRetries: 1 } });
    await queue.enqueue(job);

    await vi.waitFor(async () => {
      await expect(queue.getJobStatus(job.id, job.queue)).resolves.toMatchObject({
        status: "dead-lettered",
      });
    });

    shouldFail = false;
    await expect(queue.retryJob(job.id, job.queue, "manual-replay")).resolves.toMatchObject({
      jobId: job.id,
      accepted: true,
      action: "retry",
    });

    await vi.waitFor(async () => {
      await expect(queue.getJobStatus(job.id, job.queue)).resolves.toMatchObject({
        status: "completed",
        attempts: 1,
      });
    });
    await expect(queue.getDeadLetteredJobs(job.queue)).resolves.toEqual([]);
    await expect(queue.getJobLogs(job.id, job.queue)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "dead-lettered", reason: "smtp down" }),
        expect.objectContaining({ action: "retried", reason: "manual-replay" }),
        expect.objectContaining({ action: "completed" }),
      ]),
    );

    await queue.close();
  });
});
