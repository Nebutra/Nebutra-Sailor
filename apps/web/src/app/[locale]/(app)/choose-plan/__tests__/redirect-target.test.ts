import { describe, expect, it } from "vitest";
import { resolveChoosePlanRedirect } from "../redirect-target";

describe("resolveChoosePlanRedirect", () => {
  it("redirects to /sign-in when there is no userId", () => {
    expect(resolveChoosePlanRedirect({ userId: null, orgId: "org_1", active: false })).toEqual({
      destination: "/sign-in",
    });
  });

  it("redirects to /onboarding when signed in without an org", () => {
    expect(resolveChoosePlanRedirect({ userId: "user_1", orgId: null, active: false })).toEqual({
      destination: "/onboarding",
    });
  });

  it("redirects to / when org already has an active paid plan", () => {
    expect(resolveChoosePlanRedirect({ userId: "user_1", orgId: "org_1", active: true })).toEqual({
      destination: "/",
    });
  });

  it("returns null (render the page) when signed in, has org, and no active plan", () => {
    expect(
      resolveChoosePlanRedirect({ userId: "user_1", orgId: "org_1", active: false }),
    ).toBeNull();
  });
});
