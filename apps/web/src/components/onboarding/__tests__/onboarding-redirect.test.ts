import { describe, expect, it } from "vitest";

import { decideOnboardingGate } from "../onboarding-redirect";

describe("decideOnboardingGate", () => {
  it("redirects unauthenticated users to /sign-in", () => {
    const decision = decideOnboardingGate({
      isAuthenticated: false,
      hasOrganization: false,
      plan: null,
    });
    expect(decision).toEqual({ action: "redirect", target: "/sign-in" });
  });

  it("redirects authenticated users with org and active plan to /", () => {
    const decision = decideOnboardingGate({
      isAuthenticated: true,
      hasOrganization: true,
      plan: "PRO",
    });
    expect(decision).toEqual({ action: "redirect", target: "/" });
  });

  it("renders wizard for authenticated users without an organization", () => {
    const decision = decideOnboardingGate({
      isAuthenticated: true,
      hasOrganization: false,
      plan: null,
    });
    expect(decision).toEqual({ action: "render-wizard" });
  });

  it("renders wizard for authenticated users with org but only FREE plan", () => {
    const decision = decideOnboardingGate({
      isAuthenticated: true,
      hasOrganization: true,
      plan: "FREE",
    });
    expect(decision).toEqual({ action: "render-wizard" });
  });
});
