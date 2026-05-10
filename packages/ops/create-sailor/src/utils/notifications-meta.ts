/**
 * Notifications provider registry — single source of truth for the
 * create-sailor CLI. L2 depth: metadata + env-var injection. No SDK
 * wrappers are generated; the `@nebutra/notifications` package already
 * ships provider adapters.
 */

export type NotificationsProviderId = "novu" | "knock" | "custom" | "none";

export type NotificationsRegion = "global" | "cn" | "both";

export interface NotificationsProviderMeta {
  id: NotificationsProviderId;
  name: string;
  region: NotificationsRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const NOTIFICATIONS_PROVIDERS: NotificationsProviderMeta[] = [
  {
    id: "novu",
    name: "Novu",
    region: "both",
    envVars: ["NOVU_API_KEY", "NOVU_APPLICATION_IDENTIFIER"],
    docs: "https://docs.novu.co",
    description: "Multi-channel notification infrastructure",
  },
  {
    id: "knock",
    name: "Knock",
    region: "global",
    envVars: ["KNOCK_API_KEY", "KNOCK_SIGNING_KEY", "KNOCK_PUBLIC_API_KEY"],
    docs: "https://docs.knock.app",
    description: "Product notifications platform",
  },
  {
    id: "custom",
    name: "Custom (direct dispatchers)",
    region: "both",
    envVars: [],
    docs: "",
    description: "Use email + sms + push directly",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "",
  },
];

export function getNotificationsProvider(id: string): NotificationsProviderMeta | undefined {
  return NOTIFICATIONS_PROVIDERS.find((p) => p.id === id);
}

export const NOTIFICATIONS_BY_REGION = NOTIFICATIONS_PROVIDERS.reduce<
  Record<NotificationsRegion, NotificationsProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<NotificationsRegion, NotificationsProviderMeta[]>,
);
