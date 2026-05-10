import { describe, expect, it } from "vitest";
import type { JobPayload } from "../types";
import { toBullMQDeadLetterJob } from "./bullmq";

const payload: JobPayload = {
  id: "job_123",
  queue: "email",
  type: "send",
  data: { to: "ada@example.com" },
  options: { maxRetries: 4 },
  createdAt: "2026-04-29T08:00:00.000Z",
};

describe("BullMQ dead-letter mapping", () => {
  it("maps retry-exhausted failed jobs into the shared dead-letter contract", () => {
    const deadLetter = toBullMQDeadLetterJob("email", {
      id: "job_123",
      data: payload,
      attemptsMade: 4,
      opts: { attempts: 4 },
      failedReason: "SMTP unavailable",
      finishedOn: Date.parse("2026-04-29T08:05:00.000Z"),
    });

    expect(deadLetter).toEqual({
      id: "job_123",
      queue: "email",
      type: "send",
      originalJob: payload,
      attempts: 4,
      maxRetries: 4,
      failedReason: "SMTP unavailable",
      provider: "bullmq",
      failedAt: "2026-04-29T08:05:00.000Z",
    });
  });

  it("does not report failed jobs as dead-lettered before retries are exhausted", () => {
    const deadLetter = toBullMQDeadLetterJob("email", {
      id: "job_123",
      data: payload,
      attemptsMade: 2,
      opts: { attempts: 4 },
      failedReason: "temporary SMTP throttle",
      finishedOn: Date.parse("2026-04-29T08:02:00.000Z"),
    });

    expect(deadLetter).toBeUndefined();
  });
});
