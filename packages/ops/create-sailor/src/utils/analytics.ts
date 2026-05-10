import fs from "node:fs";
import path from "node:path";
import {
  type AnalyticsProviderId,
  type AnalyticsRegion,
  getAnalyticsProvider,
} from "./analytics-meta.js";

/**
 * Analytics selection applier for create-sailor.
 *
 * L3 depth: writes real SDK wiring / script-tag components into the
 * scaffolded project for the chosen analytics provider.
 *
 * SDK versions referenced in generated code:
 *   posthog-js         ^1.205.0
 *   posthog-node       ^4.8.0
 *   mixpanel-browser   ^2.55.0
 *   mixpanel           ^0.18.0
 *   sa-sdk-javascript  ^1.25.0
 */

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function appendEnv(targetDir: string, content: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + content);
  } else {
    fs.writeFileSync(envExamplePath, content);
  }
}

// ─────────────────────────────────────────────────────────────
// PostHog
// ─────────────────────────────────────────────────────────────

function writePostHogFiles(webDir: string): void {
  const client = `"use client";
/**
 * PostHog browser SDK — lazy-initialized on first access.
 */
import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
  initialized = true;
}

export { posthog };
`;

  const server = `import { PostHog } from "posthog-node";

/**
 * PostHog server-side client. Remember to await client.shutdown() at the end
 * of serverless requests so events are flushed before the invocation dies.
 */
let client: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  if (client) return client;
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getPostHogServerClient();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
  await ph.shutdown();
}
`;

  const provider = `"use client";
/**
 * <AnalyticsProvider /> — wrap the app root to enable PostHog + auto page views.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "../../lib/analytics/posthog.client";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const url =
      window.location.origin +
      pathname +
      (searchParams?.toString() ? \`?\${searchParams.toString()}\` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
`;

  writeFile(path.join(webDir, "src", "lib", "analytics", "posthog.client.ts"), client);
  writeFile(path.join(webDir, "src", "lib", "analytics", "posthog.server.ts"), server);
  writeFile(path.join(webDir, "src", "components", "analytics", "AnalyticsProvider.tsx"), provider);
}

function postHogEnv(): string {
  return `# PostHog — product analytics
POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
`;
}

// ─────────────────────────────────────────────────────────────
// Plausible
// ─────────────────────────────────────────────────────────────

function writePlausibleFiles(webDir: string): void {
  const script = `"use client";
/**
 * Plausible script tag — lightweight, privacy-friendly analytics.
 */
import Script from "next/script";

export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
  if (!domain) return null;
  return (
    <Script
      id="plausible"
      strategy="afterInteractive"
      data-domain={domain}
      src={src}
    />
  );
}
`;
  writeFile(path.join(webDir, "src", "components", "analytics", "PlausibleScript.tsx"), script);
}

function plausibleEnv(): string {
  return `# Plausible — privacy-friendly analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.io/js/script.js
`;
}

// ─────────────────────────────────────────────────────────────
// Umami
// ─────────────────────────────────────────────────────────────

function writeUmamiFiles(webDir: string): void {
  const script = `"use client";
/**
 * Umami analytics — self-hosted OR umami.is cloud.
 */
import Script from "next/script";

export function UmamiScript() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src =
    process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js";
  if (!websiteId) return null;
  return (
    <Script
      id="umami"
      strategy="afterInteractive"
      src={src}
      data-website-id={websiteId}
    />
  );
}
`;
  writeFile(path.join(webDir, "src", "components", "analytics", "UmamiScript.tsx"), script);
}

function umamiEnv(): string {
  return `# Umami — self-hostable analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
`;
}

// ─────────────────────────────────────────────────────────────
// Mixpanel
// ─────────────────────────────────────────────────────────────

function writeMixpanelFiles(webDir: string): void {
  const client = `"use client";
import mixpanel from "mixpanel-browser";

let initialized = false;

export function initMixpanel(): void {
  if (initialized || typeof window === "undefined") return;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;
  mixpanel.init(token, {
    debug: process.env.NODE_ENV !== "production",
    track_pageview: true,
    persistence: "localStorage",
  });
  initialized = true;
}

export { mixpanel };
`;

  const server = `import Mixpanel from "mixpanel";

let client: Mixpanel.Mixpanel | null = null;

export function getMixpanelServerClient(): Mixpanel.Mixpanel | null {
  if (client) return client;
  const token = process.env.MIXPANEL_TOKEN ?? process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return null;
  client = Mixpanel.init(token);
  return client;
}

export function trackServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const c = getMixpanelServerClient();
  if (!c) return;
  c.track(event, { distinct_id: distinctId, ...properties });
}
`;

  writeFile(path.join(webDir, "src", "lib", "analytics", "mixpanel.client.ts"), client);
  writeFile(path.join(webDir, "src", "lib", "analytics", "mixpanel.server.ts"), server);
}

function mixpanelEnv(): string {
  return `# Mixpanel — product analytics
MIXPANEL_TOKEN=
NEXT_PUBLIC_MIXPANEL_TOKEN=
`;
}

// ─────────────────────────────────────────────────────────────
// 百度统计
// ─────────────────────────────────────────────────────────────

function writeBaiduFiles(webDir: string): void {
  const script = `"use client";
/**
 * 百度统计 Baidu Tongji — hm.js 埋点脚本.
 */
import Script from "next/script";

export function BaiduStatsScript() {
  const id = process.env.NEXT_PUBLIC_BAIDU_STATS_ID;
  if (!id) return null;
  const inline = \`
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?\${id}";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
\`;
  return (
    <Script
      id="baidu-stats"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: inline }}
    />
  );
}
`;
  writeFile(path.join(webDir, "src", "components", "analytics", "BaiduStatsScript.tsx"), script);
}

function baiduEnv(): string {
  return `# 百度统计 — 中国区网站分析
NEXT_PUBLIC_BAIDU_STATS_ID=
`;
}

// ─────────────────────────────────────────────────────────────
// 神策 Sensors
// ─────────────────────────────────────────────────────────────

function writeSensorsFiles(webDir: string): void {
  const client = `"use client";
/**
 * 神策分析 (Sensors Analytics) — sa-sdk-javascript 封装.
 */
import sensors from "sa-sdk-javascript";

let initialized = false;

export function initSensors(): void {
  if (initialized || typeof window === "undefined") return;
  const serverUrl = process.env.NEXT_PUBLIC_SENSORS_SERVER_URL;
  if (!serverUrl) return;

  sensors.init({
    server_url: serverUrl,
    is_track_single_page: true,
    use_client_time: true,
    send_type: "beacon",
    heatmap: {
      clickmap: "default",
      scroll_notice_map: "default",
    },
  });
  sensors.quick("autoTrack");
  initialized = true;
}

export { sensors };
`;
  writeFile(path.join(webDir, "src", "lib", "analytics", "sensors.client.ts"), client);
}

function sensorsEnv(): string {
  return `# 神策分析 Sensors Analytics
NEXT_PUBLIC_SENSORS_SERVER_URL=
NEXT_PUBLIC_SENSORS_APP_JS_URL=
`;
}

// ─────────────────────────────────────────────────────────────
// GrowingIO
// ─────────────────────────────────────────────────────────────

function writeGrowingIoFiles(webDir: string): void {
  const script = `"use client";
/**
 * GrowingIO CDP — inline snippet installer.
 */
import Script from "next/script";

export function GrowingIoScript() {
  const accountId = process.env.NEXT_PUBLIC_GROWINGIO_ACCOUNT_ID;
  if (!accountId) return null;
  const inline = \`
!(function(e,t,n,g,i){e[i]=e[i]||function(){(e[i].q=e[i].q||[]).push(arguments)};
var a=t.createElement(n);a.async=!0;a.src=g;
var s=t.getElementsByTagName(n)[0];s.parentNode.insertBefore(a,s);
})(window,document,"script","https://assets.giocdn.com/vds.js","gdp");
gdp("init", "\${accountId}", {});
gdp("send");
\`;
  return (
    <Script
      id="growingio"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: inline }}
    />
  );
}
`;
  writeFile(path.join(webDir, "src", "components", "analytics", "GrowingIoScript.tsx"), script);
}

function growingIoEnv(): string {
  return `# GrowingIO — 全埋点 CDP (中国区)
NEXT_PUBLIC_GROWINGIO_ACCOUNT_ID=
`;
}

// ─────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────

export async function applyAnalyticsSelection(
  targetDir: string,
  analyticsId: string,
  _region: AnalyticsRegion | string = "global",
): Promise<void> {
  const meta = getAnalyticsProvider(analyticsId);
  if (!meta || meta.id === "none") return;

  const webDir = path.join(targetDir, "apps", "web");
  if (!fs.existsSync(webDir)) return;

  const id = meta.id as AnalyticsProviderId;

  try {
    switch (id) {
      case "posthog":
        writePostHogFiles(webDir);
        appendEnv(targetDir, postHogEnv());
        return;
      case "plausible":
        writePlausibleFiles(webDir);
        appendEnv(targetDir, plausibleEnv());
        return;
      case "umami":
        writeUmamiFiles(webDir);
        appendEnv(targetDir, umamiEnv());
        return;
      case "mixpanel":
        writeMixpanelFiles(webDir);
        appendEnv(targetDir, mixpanelEnv());
        return;
      case "baidu":
        writeBaiduFiles(webDir);
        appendEnv(targetDir, baiduEnv());
        return;
      case "sensors":
        writeSensorsFiles(webDir);
        appendEnv(targetDir, sensorsEnv());
        return;
      case "growingio":
        writeGrowingIoFiles(webDir);
        appendEnv(targetDir, growingIoEnv());
        return;
      default:
        return;
    }
  } catch (error) {
    console.error(`Failed to apply analytics selection "${analyticsId}":`, error);
    throw new Error(`Analytics scaffold for "${analyticsId}" failed — see stderr for details.`);
  }
}
