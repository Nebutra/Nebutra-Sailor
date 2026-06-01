import { describe, expect, it } from "vitest";
import { resolveWebProductCapabilities } from "@/lib/product-capabilities";

describe("resolveWebProductCapabilities", () => {
  it("applies safe user-workspace defaults when preset env is absent", () => {
    const capabilities = resolveWebProductCapabilities({});

    expect(capabilities.workspace.mode).toBe("user");
    expect(capabilities.workspace.requireOrganization).toBe(false);
    expect(capabilities.billing.enabled).toBe(false);
    expect(capabilities.notifications.inbox).toBe(false);
    expect(capabilities.prototypes.startupAgentOS).toBe(true);
  });

  it("parses organization billing and notification capability env from preset output", () => {
    const capabilities = resolveWebProductCapabilities({
      FEATURE_FLAG_BILLING: "true",
      NEBUTRA_WORKSPACE_MODE: "organization",
      NEBUTRA_REQUIRE_ORGANIZATION: "true",
      NEBUTRA_ONBOARDING_FLOW: "marketing_to_app",
      NEBUTRA_BILLING_SUBJECT: "organization",
      NEBUTRA_BILLING_CHECKOUT_MODE: "workspace",
      NEBUTRA_BILLING_METERING: "true",
      NEBUTRA_NOTIFICATIONS_SURFACE: "workspace",
      NEBUTRA_NOTIFICATIONS_INBOX: "true",
      NEBUTRA_NOTIFICATIONS_PREFERENCES: "true",
      NEBUTRA_NOTIFICATION_CHANNELS: "in_app,email,push",
    });

    expect(capabilities.workspace).toEqual({
      mode: "organization",
      requireOrganization: true,
      onboardingFlow: "marketing_to_app",
    });
    expect(capabilities.billing).toEqual({
      enabled: true,
      subject: "organization",
      checkoutMode: "workspace",
      metering: true,
    });
    expect(capabilities.notifications).toEqual({
      surface: "workspace",
      inbox: true,
      preferences: true,
      channels: ["in_app", "email", "push"],
    });
  });

  it("keeps Startup Agent OS behind a private production flag", () => {
    expect(resolveWebProductCapabilities({ NODE_ENV: "production" }).prototypes).toEqual({
      startupAgentOS: false,
    });
    expect(
      resolveWebProductCapabilities({
        NODE_ENV: "production",
        NEXT_PUBLIC_STARTUP_AGENT_OS_PROTOTYPE: "1",
      }).prototypes,
    ).toEqual({
      startupAgentOS: false,
    });
    expect(
      resolveWebProductCapabilities({
        NODE_ENV: "production",
        STARTUP_AGENT_OS_PROTOTYPE: "1",
      }).prototypes,
    ).toEqual({
      startupAgentOS: true,
    });
  });

  it("coerces invalid enum values to safe defaults instead of leaking broken runtime config", () => {
    const capabilities = resolveWebProductCapabilities({
      FEATURE_FLAG_BILLING: "true",
      NEBUTRA_WORKSPACE_MODE: "invalid",
      NEBUTRA_BILLING_SUBJECT: "tenant",
      NEBUTRA_BILLING_CHECKOUT_MODE: "teams",
      NEBUTRA_NOTIFICATIONS_SURFACE: "global",
      NEBUTRA_NOTIFICATION_CHANNELS: "in_app,unknown,email",
    });

    expect(capabilities.workspace.mode).toBe("user");
    expect(capabilities.billing.subject).toBe("user");
    expect(capabilities.billing.checkoutMode).toBe("individual");
    expect(capabilities.notifications.surface).toBe("settings");
    expect(capabilities.notifications.channels).toEqual(["in_app", "email"]);
  });
});
