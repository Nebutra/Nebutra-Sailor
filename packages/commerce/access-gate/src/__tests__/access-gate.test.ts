import { describe, expect, it } from "vitest";
import { createAccessGate, createMemoryAccessInviteStore, hashInviteCode } from "../index";

describe("access gate invite infrastructure", () => {
  it("issues a bounded batch of platform access codes without storing plaintext", async () => {
    const store = createMemoryAccessInviteStore();
    const gate = createAccessGate({ store, issuerQuota: 2 });

    const issued = await gate.issueBatch({
      count: 2,
      issuedByUserId: "user_founder",
      scope: "platform",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
    });

    expect(issued).toHaveLength(2);
    expect(issued[0]?.plaintextCode).toMatch(/^neb_[a-z0-9]+$/);
    await expect(
      gate.issueBatch({ count: 1, issuedByUserId: "user_founder", scope: "platform" }),
    ).rejects.toThrow("Invite quota exceeded");

    const stored = await store.findByHash(await hashInviteCode(issued[0]?.plaintextCode ?? ""));
    expect(stored?.codeHash).toBe(await hashInviteCode(issued[0]?.plaintextCode ?? ""));
    expect(JSON.stringify(stored)).not.toContain(issued[0]?.plaintextCode ?? "missing");
    expect(stored?.codePrefix).toBe(issued[0]?.plaintextCode.slice(0, 12));
  });

  it("redeems an active platform code exactly once and records provenance", async () => {
    const gate = createAccessGate({
      store: createMemoryAccessInviteStore(),
      issuerQuota: 10,
      now: () => new Date("2026-05-17T00:00:00Z"),
    });
    const [issued] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_founder",
      scope: "platform",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
    });

    const result = await gate.redeem({
      plaintextCode: issued?.plaintextCode ?? "",
      redeemedByUserId: "user_new",
      email: "new@example.com",
      ipAddress: "203.0.113.10",
    });

    expect(result.status).toBe("redeemed");
    expect(result.scope).toBe("platform");
    expect(result.redemption.userId).toBe("user_new");

    await expect(
      gate.redeem({
        plaintextCode: issued?.plaintextCode ?? "",
        redeemedByUserId: "user_other",
      }),
    ).rejects.toThrow("Invite code is not active");
  });

  it("validates an invite without consuming it and enforces issued email when present", async () => {
    const gate = createAccessGate({
      store: createMemoryAccessInviteStore(),
      issuerQuota: 10,
      now: () => new Date("2026-05-17T00:00:00Z"),
    });
    const [issued] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_founder",
      scope: "platform",
      issuedToEmail: "Ada@Example.com",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
    });

    const invite = await gate.validate({
      plaintextCode: issued?.plaintextCode ?? "",
      email: "ada@example.com",
    });

    expect(invite.status).toBe("active");
    await expect(
      gate.validate({
        plaintextCode: issued?.plaintextCode ?? "",
        email: "grace@example.com",
      }),
    ).rejects.toThrow("Invite code was issued to a different email");

    await gate.redeem({
      plaintextCode: issued?.plaintextCode ?? "",
      redeemedByUserId: "user_ada",
      email: "ada@example.com",
    });
  });

  it("rejects expired, revoked, and tenant-mismatched codes before redemption", async () => {
    const store = createMemoryAccessInviteStore();
    const gate = createAccessGate({
      store,
      issuerQuota: 10,
      now: () => new Date("2026-05-17T00:00:00Z"),
    });

    const [expired] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_founder",
      scope: "platform",
      expiresAt: new Date("2026-05-01T00:00:00Z"),
    });
    await expect(
      gate.redeem({
        plaintextCode: expired?.plaintextCode ?? "",
        redeemedByUserId: "user_new",
      }),
    ).rejects.toThrow("Invite code has expired");

    const [revoked] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_founder",
      scope: "platform",
    });
    await gate.revoke({
      plaintextCode: revoked?.plaintextCode ?? "",
      revokedByUserId: "user_founder",
    });
    await expect(
      gate.redeem({
        plaintextCode: revoked?.plaintextCode ?? "",
        redeemedByUserId: "user_new",
      }),
    ).rejects.toThrow("Invite code is not active");

    const [tenantScoped] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_admin",
      scope: "tenant",
      tenantId: "org_expected",
    });
    await expect(
      gate.redeem({
        plaintextCode: tenantScoped?.plaintextCode ?? "",
        redeemedByUserId: "user_new",
        tenantId: "org_other",
      }),
    ).rejects.toThrow("Invite code does not belong to this tenant");
  });

  it("validates tenant scoped issue requests", async () => {
    const gate = createAccessGate({ store: createMemoryAccessInviteStore(), issuerQuota: 10 });

    await expect(
      gate.issueBatch({
        count: 1,
        issuedByUserId: "user_admin",
        scope: "tenant",
      }),
    ).rejects.toThrow("tenantId is required");
  });
});
