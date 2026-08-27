import { describe, expect, it } from "vitest";
import { resolvePreferredWorkspaceId } from "@/lib/workspace-selection";

const options = [{ id: "org_alpha" }, { id: "org_beta" }, { id: "org_gamma" }] as const;

describe("resolvePreferredWorkspaceId", () => {
  it("prefers the session organization id over a stored workspace", () => {
    expect(
      resolvePreferredWorkspaceId({
        options,
        sessionOrganizationId: "org_session",
        storedOrganizationId: "org_beta",
      }),
    ).toBe("org_session");
  });

  it("uses the stored workspace when it exists in the available options", () => {
    expect(
      resolvePreferredWorkspaceId({
        options,
        sessionOrganizationId: null,
        storedOrganizationId: "org_beta",
      }),
    ).toBe("org_beta");
  });

  it("falls back to the first option when the stored workspace is missing", () => {
    expect(
      resolvePreferredWorkspaceId({
        options,
        sessionOrganizationId: null,
        storedOrganizationId: "org_missing",
      }),
    ).toBe("org_alpha");
  });

  it("falls back to the first option when there is no stored workspace", () => {
    expect(
      resolvePreferredWorkspaceId({
        options,
        sessionOrganizationId: null,
        storedOrganizationId: null,
      }),
    ).toBe("org_alpha");
  });

  it("returns null when there are no options to choose from", () => {
    expect(
      resolvePreferredWorkspaceId({
        options: [],
        sessionOrganizationId: null,
        storedOrganizationId: "org_beta",
      }),
    ).toBeNull();
  });
});
