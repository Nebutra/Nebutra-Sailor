import type { ResolvedConfig } from "./config";

export type WorkspaceMode = "none" | "user" | "organization";
export type OnboardingFlow = "none" | "workspace" | "marketing_to_app";
export type BillingSubject = "none" | "user" | "organization";
export type CheckoutMode = "none" | "individual" | "workspace";
export type NotificationSurface = "none" | "settings" | "workspace";
export type NotificationChannelPreset = "in_app" | "email" | "push";

export interface ProductCapabilities {
  workspace: {
    mode: WorkspaceMode;
    requireOrganization: boolean;
    onboardingFlow: OnboardingFlow;
    adminConsole: boolean;
    publicSite: boolean;
  };
  auth: {
    provider: ResolvedConfig["authProvider"];
    organizationSwitching: boolean;
    supportsSso: boolean;
    supportsSocialLogin: boolean;
    signupSurface: boolean;
  };
  billing: {
    enabled: boolean;
    subject: BillingSubject;
    checkoutMode: CheckoutMode;
    metering: boolean;
  };
  notifications: {
    surface: NotificationSurface;
    inbox: boolean;
    preferences: boolean;
    defaultChannels: NotificationChannelPreset[];
  };
}

const ORGANIZATION_WORKSPACE_PRESETS = new Set<ResolvedConfig["preset"]>([
  "ai-saas",
  "dashboard",
  "community",
  "growth",
  "overseas",
  "full",
]);

function resolveWorkspaceMode(config: ResolvedConfig): WorkspaceMode {
  if (!config.apps.web) {
    return "none";
  }

  if (ORGANIZATION_WORKSPACE_PRESETS.has(config.preset) || config.features.sso) {
    return "organization";
  }

  return "user";
}

function resolveOnboardingFlow(
  config: ResolvedConfig,
  workspaceMode: WorkspaceMode,
): OnboardingFlow {
  if (workspaceMode === "none") {
    return "none";
  }

  return config.apps["landing-page"] ? "marketing_to_app" : "workspace";
}

function resolveBillingCapabilities(
  config: ResolvedConfig,
  workspaceMode: WorkspaceMode,
): ProductCapabilities["billing"] {
  if (!config.features.billing) {
    return {
      enabled: false,
      subject: "none",
      checkoutMode: "none",
      metering: false,
    };
  }

  const subject: BillingSubject = workspaceMode === "organization" ? "organization" : "user";

  return {
    enabled: true,
    subject,
    checkoutMode: subject === "organization" ? "workspace" : "individual",
    metering: config.features.ai || config.features.realtime || config.features.upload,
  };
}

function resolveNotificationCapabilities(
  config: ResolvedConfig,
): ProductCapabilities["notifications"] {
  if (!config.apps.web) {
    return {
      surface: "none",
      inbox: false,
      preferences: false,
      defaultChannels: [],
    };
  }

  const defaultChannels: NotificationChannelPreset[] = ["in_app", "email"];
  if (config.features.realtime) {
    defaultChannels.push("push");
  }

  return {
    surface: config.features.realtime ? "workspace" : "settings",
    inbox: true,
    preferences:
      config.features.billing ||
      config.features.analytics ||
      config.features.realtime ||
      config.features.community,
    defaultChannels,
  };
}

export function resolveProductCapabilities(config: ResolvedConfig): ProductCapabilities {
  const workspaceMode = resolveWorkspaceMode(config);

  return {
    workspace: {
      mode: workspaceMode,
      requireOrganization: workspaceMode === "organization",
      onboardingFlow: resolveOnboardingFlow(config, workspaceMode),
      adminConsole: config.apps.admin && config.features.admin,
      publicSite: config.apps["landing-page"] || config.apps.blog,
    },
    auth: {
      provider: config.authProvider,
      organizationSwitching: workspaceMode === "organization",
      supportsSso: config.features.sso,
      supportsSocialLogin: config.authProvider === "clerk",
      signupSurface: config.apps.web || config.apps["landing-page"],
    },
    billing: resolveBillingCapabilities(config, workspaceMode),
    notifications: resolveNotificationCapabilities(config),
  };
}
