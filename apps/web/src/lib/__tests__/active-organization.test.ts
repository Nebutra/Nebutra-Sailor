import { describe, expect, it } from "vitest";
import { resolveActiveOrganizationSelection } from "@/lib/active-organization";

const organizations = [{ id: "org_alpha" }, { id: "org_beta" }] as const;

describe("active organization selection", () => {
  it("prefers the organization id already present on the session", () => {
    expect(
      resolveActiveOrganizationSelection({
        sessionOrganizationId: "org_session",
        cookieOrganizationId: "org_alpha",
        organizations,
      }),
    ).toBe("org_session");
  });

  it("uses a cookie-selected organization when it matches a membership", () => {
    expect(
      resolveActiveOrganizationSelection({
        sessionOrganizationId: null,
        cookieOrganizationId: "org_beta",
        organizations,
      }),
    ).toBe("org_beta");
  });

  it("falls back to the only organization when there is exactly one membership", () => {
    expect(
      resolveActiveOrganizationSelection({
        sessionOrganizationId: null,
        cookieOrganizationId: "org_missing",
        organizations: [{ id: "org_only" }],
      }),
    ).toBe("org_only");
  });

  it("returns null when neither session nor cookie can resolve among multiple memberships", () => {
    expect(
      resolveActiveOrganizationSelection({
        sessionOrganizationId: null,
        cookieOrganizationId: "org_missing",
        organizations,
      }),
    ).toBeNull();
  });
});
