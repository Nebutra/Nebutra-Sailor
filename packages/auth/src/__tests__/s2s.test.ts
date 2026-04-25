import { describe, expect, it } from "vitest";
import { signServiceToken, verifyServiceToken } from "../s2s";

describe("service-to-service tokens", () => {
  it("signs and verifies tenant-scoped claims", () => {
    const token = signServiceToken(
      { organizationId: "org_123", userId: "user_123" },
      "test-secret",
      { now: new Date("2026-01-01T00:00:00.000Z") },
    );

    const payload = verifyServiceToken(token, "test-secret", {
      now: new Date("2026-01-01T00:01:00.000Z"),
    });

    expect(payload.organizationId).toBe("org_123");
    expect(payload.userId).toBe("user_123");
    expect(payload.iat).toBe(1767225600);
    expect(payload.exp).toBe(1767225900);
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signServiceToken({ organizationId: "org_123" }, "test-secret");

    expect(() => verifyServiceToken(token, "other-secret")).toThrow(
      "Invalid service token signature",
    );
  });

  it("rejects expired tokens", () => {
    const token = signServiceToken({ organizationId: "org_123" }, "test-secret", {
      now: new Date("2026-01-01T00:00:00.000Z"),
      expiresInSeconds: 10,
    });

    expect(() =>
      verifyServiceToken(token, "test-secret", {
        now: new Date("2026-01-01T00:00:11.000Z"),
      }),
    ).toThrow("Service token expired");
  });
});
