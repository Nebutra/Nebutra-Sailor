/**
 * Analytics provider registry.
 *
 * Single source of truth for the create-sailor CLI to drive prompts,
 * env-var injection, and code generation for product-analytics providers.
 */

export type AnalyticsProviderId =
  | "posthog"
  | "plausible"
  | "umami"
  | "mixpanel"
  | "baidu"
  | "sensors"
  | "growingio"
  | "none";

export type AnalyticsRegion = "global" | "cn" | "both";

export interface AnalyticsProviderMeta {
  id: AnalyticsProviderId;
  name: string;
  region: AnalyticsRegion;
  envVars: string[];
  docs: string;
  /**
   * npm packages written into generated code (not installed by CLI).
   */
  pkgs?: string[];
  /**
   * Optional entry file for the generated analytics module.
   */
  providerFile?: string;
}

export const ANALYTICS_PROVIDERS: AnalyticsProviderMeta[] = [
  {
    id: "posthog",
    name: "PostHog",
    region: "both",
    envVars: ["POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
    docs: "https://posthog.com/docs",
    pkgs: ["posthog-js", "posthog-node"],
    providerFile: "apps/web/src/lib/analytics/posthog.client.ts",
  },
  {
    id: "plausible",
    name: "Plausible",
    region: "global",
    envVars: ["NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "NEXT_PUBLIC_PLAUSIBLE_SRC"],
    docs: "https://plausible.io/docs",
    providerFile: "apps/web/src/components/analytics/PlausibleScript.tsx",
  },
  {
    id: "umami",
    name: "Umami",
    region: "both",
    envVars: ["NEXT_PUBLIC_UMAMI_WEBSITE_ID", "NEXT_PUBLIC_UMAMI_SRC"],
    docs: "https://umami.is/docs",
    providerFile: "apps/web/src/components/analytics/UmamiScript.tsx",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    region: "global",
    envVars: ["MIXPANEL_TOKEN", "NEXT_PUBLIC_MIXPANEL_TOKEN"],
    docs: "https://docs.mixpanel.com",
    pkgs: ["mixpanel-browser", "mixpanel"],
    providerFile: "apps/web/src/lib/analytics/mixpanel.client.ts",
  },
  {
    id: "baidu",
    name: "百度统计 Baidu Tongji",
    region: "cn",
    envVars: ["NEXT_PUBLIC_BAIDU_STATS_ID"],
    docs: "https://tongji.baidu.com",
    providerFile: "apps/web/src/components/analytics/BaiduStatsScript.tsx",
  },
  {
    id: "sensors",
    name: "神策 Sensors Analytics",
    region: "cn",
    envVars: ["NEXT_PUBLIC_SENSORS_SERVER_URL", "NEXT_PUBLIC_SENSORS_APP_JS_URL"],
    docs: "https://manual.sensorsdata.cn",
    pkgs: ["sa-sdk-javascript"],
    providerFile: "apps/web/src/lib/analytics/sensors.client.ts",
  },
  {
    id: "growingio",
    name: "GrowingIO",
    region: "cn",
    envVars: ["NEXT_PUBLIC_GROWINGIO_ACCOUNT_ID"],
    docs: "https://growingio.com/docs",
    providerFile: "apps/web/src/components/analytics/GrowingIoScript.tsx",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
  },
];

export const ANALYTICS_BY_REGION = ANALYTICS_PROVIDERS.reduce<
  Record<AnalyticsRegion, AnalyticsProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<AnalyticsRegion, AnalyticsProviderMeta[]>,
);

export function getAnalyticsProvider(id: string): AnalyticsProviderMeta | undefined {
  return ANALYTICS_PROVIDERS.find((p) => p.id === id);
}
