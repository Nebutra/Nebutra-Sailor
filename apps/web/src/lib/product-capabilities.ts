export type WebWorkspaceMode = "none" | "user" | "organization";
export type WebOnboardingFlow = "none" | "workspace" | "marketing_to_app";
export type WebBillingSubject = "none" | "user" | "organization";
export type WebCheckoutMode = "none" | "individual" | "workspace";
export type WebNotificationSurface = "none" | "settings" | "workspace";
export type WebNotificationChannel = "in_app" | "email" | "push";

export interface WebProductCapabilities {
  workspace: {
    mode: WebWorkspaceMode;
    requireOrganization: boolean;
    onboardingFlow: WebOnboardingFlow;
  };
  billing: {
    enabled: boolean;
    subject: WebBillingSubject;
    checkoutMode: WebCheckoutMode;
    metering: boolean;
  };
  notifications: {
    surface: WebNotificationSurface;
    inbox: boolean;
    preferences: boolean;
    channels: WebNotificationChannel[];
  };
}

type EnvLike = Record<string, string | undefined>;

function isEnabled(value: string | undefined) {
  return value === "true" || value === "1";
}

function pickEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseChannels(value: string | undefined): WebNotificationChannel[] {
  const allowed = new Set<WebNotificationChannel>(["in_app", "email", "push"]);
  const channels = (value ?? "")
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel): channel is WebNotificationChannel =>
      allowed.has(channel as WebNotificationChannel),
    );

  return channels.length > 0 ? channels : ["in_app", "email"];
}

export function resolveWebProductCapabilities(env: EnvLike = process.env): WebProductCapabilities {
  const workspaceMode = pickEnum<WebWorkspaceMode>(
    env.NEBUTRA_WORKSPACE_MODE,
    ["none", "user", "organization"],
    "user",
  );
  const billingEnabled = isEnabled(env.FEATURE_FLAG_BILLING);

  return {
    workspace: {
      mode: workspaceMode,
      requireOrganization:
        workspaceMode === "organization" && isEnabled(env.NEBUTRA_REQUIRE_ORGANIZATION),
      onboardingFlow: pickEnum<WebOnboardingFlow>(
        env.NEBUTRA_ONBOARDING_FLOW,
        ["none", "workspace", "marketing_to_app"],
        workspaceMode === "none" ? "none" : "workspace",
      ),
    },
    billing: {
      enabled: billingEnabled,
      subject: billingEnabled
        ? pickEnum<WebBillingSubject>(
            env.NEBUTRA_BILLING_SUBJECT,
            ["none", "user", "organization"],
            "user",
          )
        : "none",
      checkoutMode: billingEnabled
        ? pickEnum<WebCheckoutMode>(
            env.NEBUTRA_BILLING_CHECKOUT_MODE,
            ["none", "individual", "workspace"],
            "individual",
          )
        : "none",
      metering: billingEnabled && isEnabled(env.NEBUTRA_BILLING_METERING),
    },
    notifications: {
      surface: pickEnum<WebNotificationSurface>(
        env.NEBUTRA_NOTIFICATIONS_SURFACE,
        ["none", "settings", "workspace"],
        "settings",
      ),
      inbox: isEnabled(env.NEBUTRA_NOTIFICATIONS_INBOX),
      preferences: isEnabled(env.NEBUTRA_NOTIFICATIONS_PREFERENCES),
      channels: parseChannels(env.NEBUTRA_NOTIFICATION_CHANNELS),
    },
  };
}
