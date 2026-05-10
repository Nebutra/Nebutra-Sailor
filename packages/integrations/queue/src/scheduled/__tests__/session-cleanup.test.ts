import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSessionCleanup, sessionCleanup } from "../jobs/session-cleanup.js";

interface FakeClient {
  authSession: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
}

const makeFakeClient = (count: number): FakeClient => ({
  authSession: {
    deleteMany: vi.fn().mockResolvedValue({ count }),
  },
});

describe("session-cleanup job definition", () => {
  it("registers under a stable name and daily-midnight cron", () => {
    expect(sessionCleanup.name).toBe("session-cleanup");
    expect(sessionCleanup.cron).toBe("0 0 * * *");
    expect(typeof sessionCleanup.handler).toBe("function");
  });
});

describe("runSessionCleanup", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("deletes auth_sessions whose expires_at is in the past", async () => {
    const client = makeFakeClient(7);
    const before = new Date();

    const result = await runSessionCleanup({ client: client as never });

    expect(result.ok).toBe(true);
    expect(result.details).toMatchObject({ deleted: 7 });
    expect(client.authSession.deleteMany).toHaveBeenCalledTimes(1);

    const callArgs = client.authSession.deleteMany.mock.calls[0]?.[0];
    expect(callArgs.where.expiresAt.lt).toBeInstanceOf(Date);
    expect((callArgs.where.expiresAt.lt as Date).getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it("returns ok with a zero deleted count when no rows match", async () => {
    const client = makeFakeClient(0);
    const result = await runSessionCleanup({ client: client as never });

    expect(result.ok).toBe(true);
    expect(result.details).toMatchObject({ deleted: 0 });
  });

  it("uses strict-less-than against now to leave still-valid sessions untouched", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2026-05-09T00:00:00.000Z");
    vi.setSystemTime(fixedNow);

    const client = makeFakeClient(0);
    await runSessionCleanup({ client: client as never });

    const where = client.authSession.deleteMany.mock.calls[0]?.[0].where;
    expect(where.expiresAt).toEqual({ lt: fixedNow });
  });

  it("propagates database errors as a thrown failure", async () => {
    const client: FakeClient = {
      authSession: {
        deleteMany: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
    };
    await expect(runSessionCleanup({ client: client as never })).rejects.toThrow(
      "connection refused",
    );
  });
});
