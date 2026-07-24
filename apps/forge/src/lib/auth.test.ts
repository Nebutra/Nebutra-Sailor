import { describe, expect, it } from "vitest";
import { resolveTenantId } from "./tenant";

describe("resolveTenantId", () => {
  it("prefers explicit tenant", () => {
    expect(
      resolveTenantId({
        explicit: "org_123",
        session: { userId: "u1", organizationId: "org_x" } as never,
      }),
    ).toBe("org_123");
  });
  it("uses organization then user", () => {
    expect(resolveTenantId({ session: { userId: "u1", organizationId: "org_x" } as never })).toBe(
      "org_x",
    );
    expect(resolveTenantId({ session: { userId: "u1" } as never })).toBe("user:u1");
  });
  it("falls back to anonymous", () => {
    expect(resolveTenantId({})).toBe("anonymous");
  });
});
