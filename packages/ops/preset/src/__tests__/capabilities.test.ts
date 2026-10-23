import { describe, expect, it } from "vitest";
import { resolveProductCapabilities } from "../capabilities";
import { defineConfig, type NebutraConfigInput, resolveConfig } from "../config";

const capabilitiesFor = (input: NebutraConfigInput) =>
  resolveProductCapabilities(resolveConfig(defineConfig(input)));

describe("resolveProductCapabilities", () => {
  it("turns the workspace, onboarding and notifications off without the web app", () => {
    const caps = capabilitiesFor({ apps: { web: false } });

    expect(caps.workspace.mode).toBe("none");
    expect(caps.workspace.requireOrganization).toBe(false);
    expect(caps.workspace.onboardingFlow).toBe("none");
    expect(caps.notifications).toEqual({
      surface: "none",
      inbox: false,
      preferences: false,
      defaultChannels: [],
    });
  });

  it("makes SSO projects organization workspaces that bill the organization", () => {
    const caps = capabilitiesFor({ features: { sso: true, billing: true } });

    expect(caps.workspace.mode).toBe("organization");
    expect(caps.workspace.requireOrganization).toBe(true);
    expect(caps.auth.organizationSwitching).toBe(true);
    expect(caps.billing.subject).toBe("organization");
    expect(caps.billing.checkoutMode).toBe("workspace");
  });

  it("bills individuals in a user workspace", () => {
    const caps = capabilitiesFor({ features: { sso: false, billing: true } });

    expect(caps.workspace.mode).toBe("user");
    expect(caps.billing).toMatchObject({
      enabled: true,
      subject: "user",
      checkoutMode: "individual",
    });
  });

  it("reports billing as fully off when the feature is disabled", () => {
    const caps = capabilitiesFor({ features: { billing: false } });

    expect(caps.billing).toEqual({
      enabled: false,
      subject: "none",
      checkoutMode: "none",
      metering: false,
    });
  });

  it("meters billing only when a usage-priced feature is on", () => {
    const off = { ai: false, realtime: false, upload: false } as const;

    expect(capabilitiesFor({ features: { billing: true, ...off } }).billing.metering).toBe(false);
    expect(
      capabilitiesFor({ features: { billing: true, ...off, upload: true } }).billing.metering,
    ).toBe(true);
  });

  it("onboards straight into the workspace when there is no landing site", () => {
    expect(capabilitiesFor({ apps: { landing: false } }).workspace.onboardingFlow).toBe(
      "workspace",
    );
    expect(capabilitiesFor({ apps: { landing: true } }).workspace.onboardingFlow).toBe(
      "marketing_to_app",
    );
  });

  it("keeps notifications in settings, without push, when realtime is off", () => {
    const caps = capabilitiesFor({
      features: {
        realtime: false,
        billing: false,
        analytics: false,
        community: false,
      },
    });

    expect(caps.notifications).toEqual({
      surface: "settings",
      inbox: true,
      preferences: false,
      defaultChannels: ["in_app", "email"],
    });
  });

  it("adds push and a workspace surface when realtime is on", () => {
    const caps = capabilitiesFor({ features: { realtime: true } });

    expect(caps.notifications.surface).toBe("workspace");
    expect(caps.notifications.defaultChannels).toEqual(["in_app", "email", "push"]);
    expect(caps.notifications.preferences).toBe(true);
  });
});
