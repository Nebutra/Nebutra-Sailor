import { beforeEach, describe, expect, it, vi } from "vitest";
import { invitationCleanup, runInvitationCleanup } from "../jobs/invitation-cleanup.js";

interface FakeClient {
  organizationInvitation: {
    updateMany: ReturnType<typeof vi.fn>;
  };
}

const makeFakeClient = (count: number): FakeClient => ({
  organizationInvitation: {
    updateMany: vi.fn().mockResolvedValue({ count }),
  },
});

describe("invitation-cleanup job definition", () => {
  it("registers under a stable name and 6-hour cron", () => {
    expect(invitationCleanup.name).toBe("invitation-cleanup");
    expect(invitationCleanup.cron).toBe("0 */6 * * *");
    expect(typeof invitationCleanup.handler).toBe("function");
  });
});

describe("runInvitationCleanup", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("marks pending invitations whose expires_at is in the past as expired", async () => {
    const client = makeFakeClient(3);
    const before = new Date();

    const result = await runInvitationCleanup({ client: client as never });

    expect(result.ok).toBe(true);
    expect(result.details).toMatchObject({ expired: 3 });
    expect(client.organizationInvitation.updateMany).toHaveBeenCalledTimes(1);

    const callArgs = client.organizationInvitation.updateMany.mock.calls[0]?.[0];
    expect(callArgs.where.status).toBe("pending");
    expect(callArgs.where.expiresAt.lt).toBeInstanceOf(Date);
    // The cutoff time must be at-or-after the moment the function was invoked.
    expect((callArgs.where.expiresAt.lt as Date).getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(callArgs.data.status).toBe("expired");
  });

  it("returns ok with a zero count when no invitations match", async () => {
    const client = makeFakeClient(0);
    const result = await runInvitationCleanup({ client: client as never });

    expect(result.ok).toBe(true);
    expect(result.details).toMatchObject({ expired: 0 });
  });

  it("only touches rows where status is pending (other statuses are filtered in WHERE)", async () => {
    const client = makeFakeClient(1);
    await runInvitationCleanup({ client: client as never });

    const where = client.organizationInvitation.updateMany.mock.calls[0]?.[0].where;
    // The handler must NEVER touch already-accepted/declined/expired rows.
    expect(where.status).toBe("pending");
  });

  it("only targets rows expired strictly before now (idempotent re-runs)", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2026-05-09T12:00:00.000Z");
    vi.setSystemTime(fixedNow);

    const client = makeFakeClient(2);
    await runInvitationCleanup({ client: client as never });

    const where = client.organizationInvitation.updateMany.mock.calls[0]?.[0].where;
    expect(where.expiresAt).toEqual({ lt: fixedNow });
  });

  it("propagates database errors as a thrown failure", async () => {
    const client: FakeClient = {
      organizationInvitation: {
        updateMany: vi.fn().mockRejectedValue(new Error("db down")),
      },
    };
    await expect(runInvitationCleanup({ client: client as never })).rejects.toThrow("db down");
  });
});
