/**
 * Monitoring (APM / error tracking) provider registry.
 *
 * Single source of truth for the create-sailor CLI to drive prompts,
 * env-var injection, and code generation for monitoring providers.
 */

export type MonitoringProviderId =
  | "sentry"
  | "datadog"
  | "bugsnag"
  | "aliyun-arms"
  | "tingyun"
  | "none";

export type MonitoringRegion = "global" | "cn" | "both";

export interface MonitoringProviderMeta {
  id: MonitoringProviderId;
  name: string;
  region: MonitoringRegion;
  envVars: string[];
  docs: string;
  pkg?: string;
  /**
   * Where the scaffolder should inject initialization code (relative to targetDir).
   */
  instrumentationFile?: string;
}

export const MONITORING_PROVIDERS: MonitoringProviderMeta[] = [
  {
    id: "sentry",
    name: "Sentry",
    region: "both",
    envVars: ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
    docs: "https://docs.sentry.io",
    pkg: "@sentry/nextjs",
    instrumentationFile: "apps/web/instrumentation.ts",
  },
  {
    id: "datadog",
    name: "Datadog",
    region: "global",
    envVars: ["DD_API_KEY", "DD_APP_KEY", "DD_SITE"],
    docs: "https://docs.datadoghq.com",
    pkg: "dd-trace",
    instrumentationFile: "apps/web/instrumentation.ts",
  },
  {
    id: "bugsnag",
    name: "Bugsnag",
    region: "global",
    envVars: ["BUGSNAG_API_KEY", "NEXT_PUBLIC_BUGSNAG_API_KEY"],
    docs: "https://docs.bugsnag.com",
    pkg: "@bugsnag/js",
    instrumentationFile: "apps/web/src/lib/monitoring/bugsnag.ts",
  },
  {
    id: "aliyun-arms",
    name: "阿里云 ARMS",
    region: "cn",
    envVars: ["ALIYUN_ARMS_LICENSE_KEY", "ALIYUN_ARMS_APP_NAME", "NEXT_PUBLIC_ARMS_PID"],
    docs: "https://help.aliyun.com/product/34364.html",
    instrumentationFile: "apps/web/src/components/monitoring/ArmsScript.tsx",
  },
  {
    id: "tingyun",
    name: "听云 TingYun",
    region: "cn",
    envVars: ["TINGYUN_LICENSE_KEY", "NEXT_PUBLIC_TINGYUN_APP_KEY"],
    docs: "https://www.tingyun.com/docs",
    instrumentationFile: "apps/web/src/components/monitoring/TingYunScript.tsx",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
  },
];

export const MONITORING_BY_REGION = MONITORING_PROVIDERS.reduce<
  Record<MonitoringRegion, MonitoringProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<MonitoringRegion, MonitoringProviderMeta[]>,
);

export function getMonitoringProvider(id: string): MonitoringProviderMeta | undefined {
  return MONITORING_PROVIDERS.find((p) => p.id === id);
}
