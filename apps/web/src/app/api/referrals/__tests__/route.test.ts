import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getTenantDbMock = vi.fn();

const dbMock = {
  referral: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  organizationMember: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({ getAuth: getAuthMock }));
vi.mock("@/lib/db", () => ({ getTenantDb: getTenantDbMock }));
vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/referrals/route");
}

const NOW = new Date("2026-08-20T00:00:00.000Z");

function referralRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ref_1",
    code: "ABCD2345",
    referrerUserId: "user_1",
    referredEmail: null,
    referredUserId: null,
    status: "pending",
    rewardCredits: 0,
    level: 0,
    expiresAt: new Date("2026-11-18T00:00:00.000Z"),
    claimedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

function getRequest() {
  return new Request("http://localhost:3001/api/referrals");
}

function postRequest(body: unknown) {
  return new Request("http://localhost:3001/api/referrals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/referrals", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");
    getAuthMock.mockReset().mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      isSignedIn: true,
      sessionClaims: { org_role: "org:member" },
    });
    getTenantDbMock.mockReset().mockReturnValue(dbMock);
    dbMock.referral.findFirst.mockReset().mockResolvedValue(null);
    dbMock.referral.findUnique.mockReset().mockResolvedValue(null);
    dbMock.referral.findMany.mockReset().mockResolvedValue([]);
    dbMock.referral.create.mockReset().mockResolvedValue(referralRow());
    dbMock.referral.updateMany.mockReset().mockResolvedValue({ count: 1 });
    dbMock.organizationMember.findMany.mockReset().mockResolvedValue([{ userId: "user_2" }]);
  });

  describe("GET", () => {
    it("rejects an anonymous caller", async () => {
      getAuthMock.mockResolvedValue({ isSignedIn: false, userId: null, sessionClaims: {} });
      const { GET } = await loadRoute();
      const res = await GET(getRequest());
      expect(res.status).toBe(401);
    });

    it("rejects a session without an active organization", async () => {
      getAuthMock.mockResolvedValue({
        isSignedIn: true,
        userId: "user_1",
        orgId: null,
        sessionClaims: {},
      });
      const { GET } = await loadRoute();
      const res = await GET(getRequest());
      expect(res.status).toBe(403);
    });

    it("issues a code on first read and scopes the ledger to tenant members", async () => {
      const { GET } = await loadRoute();
      const res = await GET(getRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(dbMock.referral.create).toHaveBeenCalledTimes(1);
      expect(body.stats.referralCode).toBe("ABCD2345");
      expect(body.stats.shareUrl).toBe("https://app.example.test/sign-up?ref=ABCD2345");
      expect(body.referrals).toHaveLength(1);
      expect(body.referrals[0].isMine).toBe(true);

      expect(getTenantDbMock).toHaveBeenCalledWith("org_1");
      expect(dbMock.organizationMember.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org_1" },
        select: { userId: true },
      });
      const where = dbMock.referral.findMany.mock.calls[0][0].where;
      expect(where.referrerUserId.in.sort()).toEqual(["user_1", "user_2"]);
    });

    it("reuses an existing open code instead of issuing another", async () => {
      const existing = referralRow({ id: "ref_open", code: "PIONEER1" });
      dbMock.referral.findFirst.mockResolvedValue(existing);
      dbMock.referral.findMany.mockResolvedValue([existing]);

      const { GET } = await loadRoute();
      const body = await (await GET(getRequest())).json();

      expect(dbMock.referral.create).not.toHaveBeenCalled();
      expect(body.stats.referralCode).toBe("PIONEER1");
      expect(body.referrals).toHaveLength(1);
    });

    it("summarizes claimed invites into credits and a level", async () => {
      const claimed = Array.from({ length: 7 }, (_, index) =>
        referralRow({
          id: `ref_claimed_${index}`,
          code: `CLAIMED${index}`,
          status: "claimed",
          referredUserId: `user_x${index}`,
          rewardCredits: 2000,
          claimedAt: NOW,
        }),
      );
      dbMock.referral.findMany.mockResolvedValue(claimed);

      const { GET } = await loadRoute();
      const body = await (await GET(getRequest())).json();

      expect(body.stats.totalInvites).toBe(7);
      expect(body.stats.pointsEarned).toBe(14000);
      expect(body.stats.currentLevel).toBe(1);
      expect(body.stats.openCodes).toBe(1);
    });

    it("does not credit a teammate's claims to the caller", async () => {
      dbMock.referral.findMany.mockResolvedValue([
        referralRow({
          id: "ref_teammate",
          code: "TEAMMATE",
          referrerUserId: "user_2",
          status: "claimed",
          referredUserId: "user_9",
          rewardCredits: 2000,
          claimedAt: NOW,
        }),
      ]);

      const { GET } = await loadRoute();
      const body = await (await GET(getRequest())).json();

      // The teammate's row stays in the tenant ledger…
      expect(body.referrals.map((row: { id: string }) => row.id)).toContain("ref_teammate");
      // …but never lands in the reader's own standing.
      expect(body.stats.totalInvites).toBe(0);
      expect(body.stats.pointsEarned).toBe(0);
      expect(body.stats.currentLevel).toBe(0);
    });

    it("returns 500 when the ledger read fails", async () => {
      dbMock.referral.findMany.mockRejectedValue(new Error("connection lost"));
      const { GET } = await loadRoute();
      const res = await GET(getRequest());
      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe("Failed to load referrals.");
    });
  });

  describe("POST", () => {
    it("rejects a malformed body", async () => {
      const { POST } = await loadRoute();
      expect((await POST(postRequest("not json"))).status).toBe(400);
      expect((await POST(postRequest({}))).status).toBe(400);
      expect((await POST(postRequest({ code: "no spaces here" }))).status).toBe(400);
    });

    it("redeems a peer code and records the referrer reward", async () => {
      dbMock.referral.findUnique.mockResolvedValue(
        referralRow({ referrerUserId: "user_2", code: "PEERCODE" }),
      );

      const { POST } = await loadRoute();
      const res = await POST(postRequest({ code: "peercode" }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(dbMock.referral.findUnique).toHaveBeenCalledWith({ where: { code: "PEERCODE" } });
      expect(dbMock.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: "PEERCODE", status: "pending", referredUserId: null },
        }),
      );
      expect(body.referral.status).toBe("claimed");
      expect(body.referral.rewardCredits).toBe(2000);
    });

    it("refuses an unknown code", async () => {
      dbMock.referral.findUnique.mockResolvedValue(null);
      const { POST } = await loadRoute();
      const res = await POST(postRequest({ code: "NOSUCH12" }));
      expect(res.status).toBe(404);
      expect(dbMock.referral.updateMany).not.toHaveBeenCalled();
    });

    it("refuses self-referral", async () => {
      dbMock.referral.findUnique.mockResolvedValue(referralRow({ referrerUserId: "user_1" }));
      const { POST } = await loadRoute();
      const res = await POST(postRequest({ code: "ABCD2345" }));
      expect(res.status).toBe(409);
      expect(dbMock.referral.updateMany).not.toHaveBeenCalled();
    });

    it("refuses an already-claimed code", async () => {
      dbMock.referral.findUnique.mockResolvedValue(
        referralRow({ referrerUserId: "user_2", status: "claimed", referredUserId: "user_3" }),
      );
      const { POST } = await loadRoute();
      expect((await POST(postRequest({ code: "ABCD2345" }))).status).toBe(409);
    });

    it("refuses an expired code", async () => {
      dbMock.referral.findUnique.mockResolvedValue(
        referralRow({ referrerUserId: "user_2", expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
      );
      const { POST } = await loadRoute();
      expect((await POST(postRequest({ code: "ABCD2345" }))).status).toBe(410);
    });

    it("allows only one redemption per user", async () => {
      dbMock.referral.findUnique.mockResolvedValue(referralRow({ referrerUserId: "user_2" }));
      dbMock.referral.findFirst.mockResolvedValue(referralRow({ id: "ref_prior" }));
      const { POST } = await loadRoute();
      const res = await POST(postRequest({ code: "ABCD2345" }));
      expect(res.status).toBe(409);
      expect(dbMock.referral.updateMany).not.toHaveBeenCalled();
    });

    it("loses the race gracefully when the conditional update matches nothing", async () => {
      dbMock.referral.findUnique.mockResolvedValue(referralRow({ referrerUserId: "user_2" }));
      dbMock.referral.updateMany.mockResolvedValue({ count: 0 });
      const { POST } = await loadRoute();
      const res = await POST(postRequest({ code: "ABCD2345" }));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toContain("already been claimed");
    });
  });
});
