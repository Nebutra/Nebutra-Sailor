/**
 * Webhooks provider registry for outbound webhook management.
 * Mirrors the `@nebutra/webhooks` adapter set (Svix managed + custom).
 */

export type WebhooksProviderId = "svix" | "custom" | "none";

export type WebhooksRegion = "global" | "cn" | "both";

export interface WebhooksProviderMeta {
  id: WebhooksProviderId;
  name: string;
  region: WebhooksRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const WEBHOOKS_PROVIDERS: WebhooksProviderMeta[] = [
  {
    id: "svix",
    name: "Svix",
    region: "global",
    envVars: ["SVIX_API_TOKEN"],
    docs: "https://docs.svix.com",
    description: "Managed webhooks platform",
  },
  {
    id: "custom",
    name: "Custom (self-hosted)",
    region: "both",
    envVars: ["WEBHOOK_SIGNING_SECRET"],
    docs: "",
    description: "Custom implementation with built-in package",
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

export function getWebhooksProvider(id: string): WebhooksProviderMeta | undefined {
  return WEBHOOKS_PROVIDERS.find((p) => p.id === id);
}

export const WEBHOOKS_BY_REGION = WEBHOOKS_PROVIDERS.reduce<
  Record<WebhooksRegion, WebhooksProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<WebhooksRegion, WebhooksProviderMeta[]>,
);
