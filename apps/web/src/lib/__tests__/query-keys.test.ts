import { describe, expect, it } from "vitest";
import { queryKeys } from "../query-keys";

describe("queryKeys.organizations.logo", () => {
  it("returns a stable tuple with entity name, 'logo', and orgId", () => {
    expect(queryKeys.organizations.logo("org_1")).toEqual(["organizations", "logo", "org_1"]);
  });

  it("is a sibling builder on the organizations namespace (not nested on detail)", () => {
    const logoKey = queryKeys.organizations.logo("org_abc");
    // Should be exactly 3 elements, NOT chained from detail
    expect(logoKey.length).toBe(3);
    expect(logoKey[0]).toBe("organizations");
    expect(logoKey[1]).toBe("logo");
    expect(logoKey[2]).toBe("org_abc");
  });
});
