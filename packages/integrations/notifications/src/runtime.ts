import type { NotificationProvider, NotificationProviderType } from "./types";

export type NotificationRuntimeMode = "self_hosted" | "preview";

export interface NotificationProviderRuntimeMetadata {
  provider: NotificationProviderType;
  preferenceStoreMode: "managed" | "adapter" | "memory";
  inAppStoreMode: "managed" | "adapter" | "memory";
}

export interface NotificationRuntimeStatus {
  provider: NotificationProviderType;
  providerLabel: string;
  mode: NotificationRuntimeMode;
  canManagePreferences: boolean;
  canViewInbox: boolean;
  canMarkInboxRead: boolean;
  summary: string;
  reason?: string;
  missing: string[];
}

type RuntimeAwareProvider = NotificationProvider & {
  getRuntimeMetadata?: () => NotificationProviderRuntimeMetadata;
};

function getProviderLabel(provider: NotificationProviderType): string {
  return provider === "direct" ? "Direct" : provider;
}

export function resolveNotificationRuntimeStatus(input?: {
  provider?: NotificationProvider;
  env?: NodeJS.ProcessEnv;
}): NotificationRuntimeStatus {
  const provider = input?.provider as RuntimeAwareProvider | undefined;
  const metadata = provider?.getRuntimeMetadata?.();
  const providerType = metadata?.provider ?? provider?.name ?? "direct";

  const preferenceStoreMode = metadata?.preferenceStoreMode ?? "memory";
  const inAppStoreMode = metadata?.inAppStoreMode ?? "memory";
  const canManagePreferences = preferenceStoreMode !== "memory";
  const canViewInbox = inAppStoreMode !== "memory";
  const canMarkInboxRead = canViewInbox;
  const missing: string[] = [];

  if (!canManagePreferences) {
    missing.push("Persistent preference storage");
  }

  if (!canViewInbox) {
    missing.push("Persistent in-app inbox storage");
  }

  if (canManagePreferences || canViewInbox) {
    return {
      provider: providerType,
      providerLabel: getProviderLabel(providerType),
      mode: "self_hosted",
      canManagePreferences,
      canViewInbox,
      canMarkInboxRead,
      summary:
        "Direct delivery adapters are connected. Nebutra can use self-hosted notification storage where adapters are available.",
      missing,
      ...(missing.length > 0 ? { reason: `${missing.join(" and ")} still need adapters.` } : {}),
    };
  }

  return {
    provider: providerType,
    providerLabel: getProviderLabel(providerType),
    mode: "preview",
    canManagePreferences: false,
    canViewInbox: false,
    canMarkInboxRead: false,
    summary:
      "Nebutra is currently using the direct fallback provider. Preferences and inbox views are shown as product defaults until persistent adapters are wired in.",
    reason:
      "The default direct provider only ships in-memory stores. Inject durable preference and inbox adapters to make this page writable.",
    missing,
  };
}
