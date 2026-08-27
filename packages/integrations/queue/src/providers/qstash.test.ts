import { describe, expect, it, vi } from "vitest";
import type { JobPayload } from "../types";
import { QStashProvider } from "./qstash";

const originalJob: JobPayload = {
  id: "job_123",
  queue: "email",
  type: "send",
  data: { to: "ada@example.com" },
  options: { maxRetries: 4 },
  createdAt: "2026-04-29T08:00:00.000Z",
};

describe("QStashProvider dead-letter observability", () => {
  it("maps injected provider DLQ records into the shared dead-letter contract", async () => {
    const dlqFetcher = vi.fn().mockResolvedValue([
      {
        messageId: "msg_123",
        header: {
          "x-nebutra-job-id": ["job_123"],
          "x-nebutra-job-type": ["send"],
        },
        body: JSON.stringify(originalJob),
        maxRetries: 4,
        failedAt: "2026-04-29T08:05:00.000Z",
        responseStatus: 500,
        responseBody: "SMTP unavailable",
      },
      {
        messageId: "msg_ignored",
        body: JSON.stringify({ ...originalJob, id: "job_ignored", queue: "billing" }),
        maxRetries: 2,
        failedAt: "2026-04-29T08:06:00.000Z",
        responseStatus: 500,
      },
    ]);

    const queue = new QStashProvider({
      token: "test-token",
      callbackBaseUrl: "https://api.nebutra.test",
      dlqEndpoint: "https://qstash.example.test/custom-dlq",
      dlqFetcher,
    });

    await expect(queue.getDeadLetteredJobs("email")).resolves.toEqual([
      {
        id: "job_123",
        queue: "email",
        type: "send",
        originalJob,
        attempts: 5,
        maxRetries: 4,
        failedReason: "SMTP unavailable",
        provider: "qstash",
        failedAt: "2026-04-29T08:05:00.000Z",
      },
    ]);

    expect(dlqFetcher).toHaveBeenCalledWith({
      endpoint: "https://qstash.example.test/custom-dlq",
      queue: "email",
      token: "test-token",
    });
  });

  it("fails closed to an empty list when the injected DLQ fetcher errors", async () => {
    const dlqFetcher = vi.fn().mockRejectedValue(new Error("rate limited"));
    const queue = new QStashProvider({
      token: "test-token",
      callbackBaseUrl: "https://api.nebutra.test",
      dlqFetcher,
    });

    await expect(queue.getDeadLetteredJobs()).resolves.toEqual([]);
  });
});
