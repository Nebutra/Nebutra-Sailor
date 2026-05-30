import { createHmac } from "node:crypto";
import { decodeJwt } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signServiceToken, verifyServiceToken } from "../s2s";

describe("service-to-service tokens", () => {
  const SECRET = "test-secret-32-bytes-minimum-len";

  it("signs and verifies tenant-scoped context", async () => {
    const token = await signServiceToken(
      { organizationId: "org_123", userId: "user_123", role: "org:admin", plan: "PRO" },
      SECRET,
    );

    expect(await verifyServiceToken(token, "user_123", "org_123", "org:admin", "PRO", SECRET)).toBe(
      true,
    );
  });

  it("embeds exp and a unique jti in each token (replay protection)", async () => {
    const ctx = { organizationId: "org_1", userId: "u_1" };
    const t1 = await signServiceToken(ctx, SECRET);
    const t2 = await signServiceToken(ctx, SECRET);

    // jti makes each token unique even for identical context — no replay reuse.
    expect(t1).not.toBe(t2);

    const c1 = decodeJwt(t1);
    const c2 = decodeJwt(t2);
    expect(c1.jti).toBeDefined();
    expect(c2.jti).toBeDefined();
    expect(c1.jti).not.toBe(c2.jti);

    // Short-lived: exp is set and is in the future relative to iat.
    expect(c1.exp).toBeDefined();
    expect(c1.iat).toBeDefined();
    expect((c1.exp as number) - (c1.iat as number)).toBe(300); // default 5 minutes
  });

  it("honors a custom expiry", async () => {
    const token = await signServiceToken(
      { organizationId: "org_1" },
      { secret: SECRET, expiresInSeconds: 60 },
    );
    const claims = decodeJwt(token);
    expect((claims.exp as number) - (claims.iat as number)).toBe(60);
  });

  it("produces different tokens for different contexts", async () => {
    const t1 = await signServiceToken({ organizationId: "org_1" }, SECRET);
    const t2 = await signServiceToken({ organizationId: "org_2" }, SECRET);
    expect(t1).not.toBe(t2);
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await signServiceToken({ organizationId: "org_123" }, SECRET);

    expect(
      await verifyServiceToken(token, undefined, "org_123", undefined, undefined, "other-secret"),
    ).toBe(false);
  });

  it("rejects context mismatches", async () => {
    const token = await signServiceToken({ organizationId: "org_123" }, SECRET);

    expect(
      await verifyServiceToken(token, undefined, "org_other", undefined, undefined, SECRET),
    ).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await signServiceToken(
      { organizationId: "org_1" },
      { secret: SECRET, expiresInSeconds: -1 },
    );
    expect(await verifyServiceToken(token, undefined, "org_1", undefined, undefined, SECRET)).toBe(
      false,
    );
  });

  it("enforces issuer/audience when provided", async () => {
    const token = await signServiceToken(
      { organizationId: "org_1" },
      { secret: SECRET, issuer: "saga", audience: "gateway" },
    );

    expect(
      await verifyServiceToken(token, undefined, "org_1", undefined, undefined, {
        secret: SECRET,
        issuer: "saga",
        audience: "gateway",
      }),
    ).toBe(true);

    expect(
      await verifyServiceToken(token, undefined, "org_1", undefined, undefined, {
        secret: SECRET,
        issuer: "other",
      }),
    ).toBe(false);
  });

  it("rejects undefined tokens", async () => {
    expect(
      await verifyServiceToken(undefined, "user_1", "org_1", undefined, undefined, SECRET),
    ).toBe(false);
  });

  it("rejects empty secret", async () => {
    expect(await verifyServiceToken("abcdef", "user_1", undefined, undefined, undefined, "")).toBe(
      false,
    );
  });

  it("throws when signing without secret", async () => {
    const originalEnv = process.env.SERVICE_SECRET;
    delete process.env.SERVICE_SECRET;
    try {
      await expect(signServiceToken({ organizationId: "org_1" }, "")).rejects.toThrow(
        "SERVICE_SECRET is required",
      );
    } finally {
      process.env.SERVICE_SECRET = originalEnv;
    }
  });

  it("verifies partial context (org only)", async () => {
    const token = await signServiceToken({ organizationId: "org_1" }, SECRET);
    expect(await verifyServiceToken(token, undefined, "org_1", undefined, undefined, SECRET)).toBe(
      true,
    );
  });

  it("verifies partial context (user + role)", async () => {
    const token = await signServiceToken({ userId: "user_1", role: "admin" }, SECRET);
    expect(await verifyServiceToken(token, "user_1", undefined, "admin", undefined, SECRET)).toBe(
      true,
    );
  });

  // ── Migration double-read: legacy hand-rolled HMAC tokens still verify ──
  // This guarantees a rolling deploy where a signer is still on the old HMAC
  // code can interoperate with a verifier on the new JWT code. Remove once all
  // signers are on the JWT scheme.
  describe("legacy HMAC double-read (migration window)", () => {
    function legacyHmacToken(
      ctx: { userId?: string; organizationId?: string; role?: string; plan?: string },
      secret: string,
    ): string {
      const canonical = [
        ctx.userId ?? "",
        ctx.organizationId ?? "",
        ctx.role ?? "",
        ctx.plan ?? "",
      ].join(":");
      return createHmac("sha256", secret).update(canonical).digest("hex");
    }

    // The legacy fallback is opt-in (default OFF). These cases exercise it with
    // the migration flag enabled; the prior value is restored afterwards.
    let priorFlag: string | undefined;
    beforeAll(() => {
      priorFlag = process.env.S2S_ALLOW_LEGACY;
      process.env.S2S_ALLOW_LEGACY = "1";
    });
    afterAll(() => {
      if (priorFlag === undefined) delete process.env.S2S_ALLOW_LEGACY;
      else process.env.S2S_ALLOW_LEGACY = priorFlag;
    });

    it("rejects legacy tokens by default when the flag is off", async () => {
      const prev = process.env.S2S_ALLOW_LEGACY;
      delete process.env.S2S_ALLOW_LEGACY;
      try {
        const legacy = legacyHmacToken({ organizationId: "org_legacy" }, SECRET);
        expect(
          await verifyServiceToken(legacy, undefined, "org_legacy", undefined, undefined, SECRET),
        ).toBe(false);
      } finally {
        process.env.S2S_ALLOW_LEGACY = prev;
      }
    });

    it("accepts a valid legacy HMAC token", async () => {
      const legacy = legacyHmacToken({ organizationId: "org_legacy" }, SECRET);
      expect(
        await verifyServiceToken(legacy, undefined, "org_legacy", undefined, undefined, SECRET),
      ).toBe(true);
    });

    it("rejects a legacy HMAC token with mismatched context", async () => {
      const legacy = legacyHmacToken({ organizationId: "org_legacy" }, SECRET);
      expect(
        await verifyServiceToken(legacy, undefined, "org_other", undefined, undefined, SECRET),
      ).toBe(false);
    });

    it("rejects a legacy HMAC token signed with a different secret", async () => {
      const legacy = legacyHmacToken({ organizationId: "org_legacy" }, "wrong-secret");
      expect(
        await verifyServiceToken(legacy, undefined, "org_legacy", undefined, undefined, SECRET),
      ).toBe(false);
    });
  });
});
