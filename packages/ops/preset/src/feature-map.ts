import { resolveProductCapabilities } from "./capabilities";
import type { ResolvedConfig } from "./config";

const APP_PACKAGE_MAP: Record<string, string> = {
  web: "@nebutra/web",
  "landing-page": "@nebutra/landing-page",
  blog: "@nebutra/blog",
  admin: "@nebutra/admin",
  "api-gateway": "@nebutra/api-gateway",
  studio: "@nebutra/studio",
  storybook: "@nebutra/storybook",
  "sailor-docs": "@nebutra/sailor-docs",
};

export function getFeatureEnvVars(config: ResolvedConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  const capabilities = resolveProductCapabilities(config);

  for (const [feature, enabled] of Object.entries(config.features)) {
    const envKey = `FEATURE_FLAG_${feature.toUpperCase().replace(/-/g, "_")}`;
    vars[envKey] = String(enabled);
  }

  vars.NEBUTRA_THEME = config.theme;
  vars.NEBUTRA_LOCALES = config.locales.join(",");
  vars.NEBUTRA_DEFAULT_LOCALE = config.defaultLocale;

  // API protocol flags
  vars.NEBUTRA_API_PROTOCOLS = config.apiProtocols.join(",");
  vars.ENABLE_ORPC = String(config.apiProtocols.includes("orpc"));
  vars.ENABLE_TRPC = String(config.apiProtocols.includes("trpc"));
  vars.NEBUTRA_WORKSPACE_MODE = capabilities.workspace.mode;
  vars.NEBUTRA_REQUIRE_ORGANIZATION = String(capabilities.workspace.requireOrganization);
  vars.NEBUTRA_ONBOARDING_FLOW = capabilities.workspace.onboardingFlow;
  vars.NEBUTRA_AUTH_PROVIDER = capabilities.auth.provider;
  vars.NEBUTRA_AUTH_SSO = String(capabilities.auth.supportsSso);
  vars.NEBUTRA_AUTH_SOCIAL_LOGIN = String(capabilities.auth.supportsSocialLogin);
  vars.NEBUTRA_BILLING_SUBJECT = capabilities.billing.subject;
  vars.NEBUTRA_BILLING_CHECKOUT_MODE = capabilities.billing.checkoutMode;
  vars.NEBUTRA_BILLING_METERING = String(capabilities.billing.metering);
  vars.NEBUTRA_NOTIFICATIONS_SURFACE = capabilities.notifications.surface;
  vars.NEBUTRA_NOTIFICATIONS_INBOX = String(capabilities.notifications.inbox);
  vars.NEBUTRA_NOTIFICATIONS_PREFERENCES = String(capabilities.notifications.preferences);
  vars.NEBUTRA_NOTIFICATION_CHANNELS = capabilities.notifications.defaultChannels.join(",");

  return vars;
}

export function getActiveApps(config: ResolvedConfig): string[] {
  return Object.entries(config.apps)
    .filter(([, enabled]) => enabled)
    .map(([app]) => app);
}

export function getActivePackages(config: ResolvedConfig): string[] {
  return getActiveApps(config).map((app) => APP_PACKAGE_MAP[app] ?? app);
}
