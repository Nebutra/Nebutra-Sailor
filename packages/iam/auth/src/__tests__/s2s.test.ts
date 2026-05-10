import { describe, expect, it } from "vitest";
import { signServiceToken, verifyServiceToken } from "../s2s";

describe("service-to-service tokens", () => {
  const SECRET = "test-secret-32-bytes-minimum-len";

  it("signs and verifies tenant-scoped context", () => {
    const token = signServiceToken(
      { organizationId: "org_123", userId: "user_123", role: "org:admin", plan: "PRO" },
      SECRET,
    );

    expect(verifyServiceToken(token, "user_123", "org_123", "org:admin", "PRO", SECRET)).toBe(true);
  });

  it("produces deterministic signatures for same input", () => {
    const ctx = { organizationId: "org_1", userId: "u_1" };
    const t1 = signServiceToken(ctx, SECRET);
    const t2 = signServiceToken(ctx, SECRET);
    expect(t1).toBe(t2);
  });

  it("produces different signatures for different contexts", () => {
    const t1 = signServiceToken({ organizationId: "org_1" }, SECRET);
    const t2 = signServiceToken({ organizationId: "org_2" }, SECRET);
    expect(t1).not.toBe(t2);
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signServiceToken({ organizationId: "org_123" }, SECRET);

    expect(
      verifyServiceToken(token, undefined, "org_123", undefined, undefined, "other-secret"),
    ).toBe(false);
  });

  it("rejects context mismatches", () => {
    const token = signServiceToken({ organizationId: "org_123" }, SECRET);

    expect(verifyServiceToken(token, undefined, "org_other", undefined, undefined, SECRET)).toBe(
      false,
    );
  });

  it("rejects undefined tokens", () => {
    expect(verifyServiceToken(undefined, "user_1", "org_1", undefined, undefined, SECRET)).toBe(
      false,
    );
  });

  it("rejects empty secret", () => {
    expect(verifyServiceToken("abcdef", "user_1", undefined, undefined, undefined, "")).toBe(false);
  });

  it("throws when signing without secret", () => {
    const originalEnv = process.env.SERVICE_SECRET;
    delete process.env.SERVICE_SECRET;
    try {
      expect(() => signServiceToken({ organizationId: "org_1" }, "")).toThrow(
        "SERVICE_SECRET is required",
      );
    } finally {
      process.env.SERVICE_SECRET = originalEnv;
    }
  });

  it("verifies partial context (org only)", () => {
    const token = signServiceToken({ organizationId: "org_1" }, SECRET);
    expect(verifyServiceToken(token, undefined, "org_1", undefined, undefined, SECRET)).toBe(true);
  });

  it("verifies partial context (user + role)", () => {
    const token = signServiceToken({ userId: "user_1", role: "admin" }, SECRET);
    expect(verifyServiceToken(token, "user_1", undefined, "admin", undefined, SECRET)).toBe(true);
  });

  it("returns hex string", () => {
    const token = signServiceToken({ organizationId: "org_1" }, SECRET);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});
