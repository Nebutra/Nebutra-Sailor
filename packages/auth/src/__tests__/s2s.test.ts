import { describe, expect, it } from "vitest";
import { signServiceToken, verifyServiceToken } from "../s2s";

describe("service-to-service tokens", () => {
  it("signs and verifies tenant-scoped context", () => {
    const token = signServiceToken(
      { organizationId: "org_123", userId: "user_123", role: "org:admin", plan: "PRO" },
      "test-secret",
    );

    expect(
      verifyServiceToken(token, "user_123", "org_123", "org:admin", "PRO", "test-secret"),
    ).toBe(true);
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signServiceToken({ organizationId: "org_123" }, "test-secret");

    expect(
      verifyServiceToken(token, undefined, "org_123", undefined, undefined, "other-secret"),
    ).toBe(false);
  });

  it("rejects context mismatches", () => {
    const token = signServiceToken({ organizationId: "org_123" }, "test-secret");

    expect(
      verifyServiceToken(token, undefined, "org_other", undefined, undefined, "test-secret"),
    ).toBe(false);
  });
});
