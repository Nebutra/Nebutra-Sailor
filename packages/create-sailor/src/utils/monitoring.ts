import fs from "node:fs";
import path from "node:path";
import {
  getMonitoringProvider,
  type MonitoringProviderId,
  type MonitoringRegion,
} from "./monitoring-meta.js";

/**
 * Monitoring selection applier for create-sailor.
 *
 * L3 depth: writes real SDK initialization files into the scaffolded project
 * based on the chosen APM / error tracking provider. No npm install is
 * performed here — the generated files reference packages the user will
 * install via `pnpm install` after scaffolding.
 *
 * Silent-skip semantics: if a target app directory doesn't exist in the
 * template (e.g. `--apps` flag dropped `apps/web`), the generator returns
 * without error.
 *
 * SDK versions pinned in generated code:
 *   @sentry/nextjs     ^8.45.0
 *   dd-trace           ^5.32.0
 *   @bugsnag/js        ^8.2.0
 *   @bugsnag/plugin-react ^8.2.0
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
// Sentry
// ─────────────────────────────────────────────────────────────

function writeSentryFiles(webDir: string): void {
  const clientConfig = `import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  environment: process.env.NODE_ENV,
});
`;

  const serverConfig = `import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
`;

  const edgeConfig = `import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
`;

  const instrumentation = `/**
 * Next.js instrumentation hook — wires Sentry into Node and Edge runtimes.
 * See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
`;

  writeFile(path.join(webDir, "sentry.client.config.ts"), clientConfig);
  writeFile(path.join(webDir, "sentry.server.config.ts"), serverConfig);
  writeFile(path.join(webDir, "sentry.edge.config.ts"), edgeConfig);
  writeFile(path.join(webDir, "instrumentation.ts"), instrumentation);
}

function sentryEnvBlock(): string {
  return `# Sentry — error tracking + performance monitoring
# Get your DSN from https://sentry.io/settings/projects/<project>/keys/
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
`;
}

// ─────────────────────────────────────────────────────────────
// Datadog
// ─────────────────────────────────────────────────────────────

function writeDatadogFiles(webDir: string): void {
  const instrumentation = `/**
 * Next.js instrumentation hook — wires Datadog APM (dd-trace) into Node runtime.
 * Edge runtime is not supported by dd-trace; only nodejs is initialized.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const tracer = (await import("dd-trace")).default;
    tracer.init({
      service: process.env.DD_SERVICE ?? "sailor-web",
      env: process.env.DD_ENV ?? process.env.NODE_ENV,
      version: process.env.DD_VERSION,
      logInjection: true,
      runtimeMetrics: true,
      profiling: true,
    });
  }
}
`;

  const rumClient = `"use client";
/**
 * Datadog RUM (Real User Monitoring) — browser-side tracking.
 * Initialize once in your root layout via <DatadogRumProvider />.
 */
import { datadogRum } from "@datadog/browser-rum";

let initialized = false;

export function initDatadogRum(): void {
  if (initialized || typeof window === "undefined") return;
  const applicationId = process.env.NEXT_PUBLIC_DD_APPLICATION_ID;
  const clientToken = process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN;
  if (!applicationId || !clientToken) return;

  datadogRum.init({
    applicationId,
    clientToken,
    site: process.env.NEXT_PUBLIC_DD_SITE ?? "datadoghq.com",
    service: process.env.NEXT_PUBLIC_DD_SERVICE ?? "sailor-web",
    env: process.env.NEXT_PUBLIC_DD_ENV ?? "production",
    version: process.env.NEXT_PUBLIC_DD_VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
  });
  initialized = true;
}
`;

  writeFile(path.join(webDir, "instrumentation.ts"), instrumentation);
  writeFile(path.join(webDir, "src", "lib", "monitoring", "datadog-rum.ts"), rumClient);
}

function datadogEnvBlock(): string {
  return `# Datadog — APM + RUM
# Server APM (dd-trace)
DD_API_KEY=
DD_APP_KEY=
DD_SITE=datadoghq.com
DD_SERVICE=sailor-web
DD_ENV=production
DD_VERSION=
# Browser RUM
NEXT_PUBLIC_DD_APPLICATION_ID=
NEXT_PUBLIC_DD_CLIENT_TOKEN=
NEXT_PUBLIC_DD_SITE=datadoghq.com
NEXT_PUBLIC_DD_SERVICE=sailor-web
NEXT_PUBLIC_DD_ENV=production
NEXT_PUBLIC_DD_VERSION=
`;
}

// ─────────────────────────────────────────────────────────────
// Bugsnag
// ─────────────────────────────────────────────────────────────

function writeBugsnagFiles(webDir: string): void {
  const serverInit = `/**
 * Bugsnag server-side initialization.
 * Import this once at the top of your server entrypoint or a shared init module.
 */
import Bugsnag from "@bugsnag/js";

let started = false;

export function startBugsnagServer(): void {
  if (started) return;
  const apiKey = process.env.BUGSNAG_API_KEY;
  if (!apiKey) return;

  Bugsnag.start({
    apiKey,
    releaseStage: process.env.NODE_ENV,
    appVersion: process.env.APP_VERSION,
  });
  started = true;
}
`;

  const clientInit = `"use client";
/**
 * Bugsnag browser initialization — wrap your app root with the returned provider.
 */
import Bugsnag from "@bugsnag/js";
import BugsnagPluginReact from "@bugsnag/plugin-react";
import React from "react";

let errorBoundary: React.ComponentType<{
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<{ error: Error }>;
}> | null = null;

export function getBugsnagErrorBoundary() {
  if (errorBoundary) return errorBoundary;
  const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;
  if (!apiKey || typeof window === "undefined") return null;

  Bugsnag.start({
    apiKey,
    plugins: [new BugsnagPluginReact()],
    releaseStage: process.env.NODE_ENV,
  });

  const plugin = Bugsnag.getPlugin("react");
  if (!plugin) return null;
  errorBoundary = plugin.createErrorBoundary(React) as typeof errorBoundary;
  return errorBoundary;
}
`;

  writeFile(path.join(webDir, "src", "lib", "monitoring", "bugsnag.server.ts"), serverInit);
  writeFile(path.join(webDir, "src", "lib", "monitoring", "bugsnag.client.tsx"), clientInit);
}

function bugsnagEnvBlock(): string {
  return `# Bugsnag — error tracking
BUGSNAG_API_KEY=
NEXT_PUBLIC_BUGSNAG_API_KEY=
APP_VERSION=
`;
}

// ─────────────────────────────────────────────────────────────
// 阿里云 ARMS
// ─────────────────────────────────────────────────────────────

function writeAliyunArmsFiles(webDir: string): void {
  const armsScript = `"use client";
/**
 * 阿里云 ARMS (Application Real-time Monitoring Service) browser agent.
 * Injects the official JS agent via next/script.
 * Docs: https://help.aliyun.com/document_detail/58655.html
 */
import Script from "next/script";

export function ArmsScript() {
  const pid = process.env.NEXT_PUBLIC_ARMS_PID;
  if (!pid) return null;
  return (
    <Script
      id="aliyun-arms"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: \`!(function(c,b,d,a){c[a]||(c[a]={});c[a].config={pid:"\${pid}",imgUrl:"https://arms-retcode.aliyuncs.com/r.png?",sendResource:true,enableLinkTrace:true,behavior:true};with(b)with(body)with(insertBefore(createElement("script"),firstChild))setAttribute("crossorigin","",src=d)})(window,document,"https://retcode.alicdn.com/retcode/bl.js","__bl");\`,
      }}
    />
  );
}
`;

  writeFile(path.join(webDir, "src", "components", "monitoring", "ArmsScript.tsx"), armsScript);
}

function aliyunArmsEnvBlock(): string {
  return `# 阿里云 ARMS — APM (中国区)
ALIYUN_ARMS_LICENSE_KEY=
ALIYUN_ARMS_APP_NAME=
NEXT_PUBLIC_ARMS_PID=
`;
}

// ─────────────────────────────────────────────────────────────
// 听云 TingYun
// ─────────────────────────────────────────────────────────────

function writeTingYunFiles(webDir: string): void {
  const tingYunScript = `"use client";
/**
 * 听云 Browser Agent (前端性能监控).
 * Docs: https://www.tingyun.com/docs
 */
import Script from "next/script";

export function TingYunScript() {
  const appKey = process.env.NEXT_PUBLIC_TINGYUN_APP_KEY;
  if (!appKey) return null;
  return (
    <Script
      id="tingyun-browser"
      strategy="afterInteractive"
      src={\`https://rs.tingyun.com/rum/\${appKey}.js\`}
    />
  );
}
`;

  writeFile(
    path.join(webDir, "src", "components", "monitoring", "TingYunScript.tsx"),
    tingYunScript,
  );
}

function tingYunEnvBlock(): string {
  return `# 听云 TingYun — APM (中国区)
TINGYUN_LICENSE_KEY=
NEXT_PUBLIC_TINGYUN_APP_KEY=
`;
}

// ─────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────

export async function applyMonitoringSelection(
  targetDir: string,
  monitoringId: string,
  _region: MonitoringRegion | string = "global",
): Promise<void> {
  const meta = getMonitoringProvider(monitoringId);
  if (!meta || meta.id === "none") return;

  const webDir = path.join(targetDir, "apps", "web");
  if (!fs.existsSync(webDir)) return;

  const id = meta.id as MonitoringProviderId;

  try {
    switch (id) {
      case "sentry":
        writeSentryFiles(webDir);
        appendEnv(targetDir, sentryEnvBlock());
        return;
      case "datadog":
        writeDatadogFiles(webDir);
        appendEnv(targetDir, datadogEnvBlock());
        return;
      case "bugsnag":
        writeBugsnagFiles(webDir);
        appendEnv(targetDir, bugsnagEnvBlock());
        return;
      case "aliyun-arms":
        writeAliyunArmsFiles(webDir);
        appendEnv(targetDir, aliyunArmsEnvBlock());
        return;
      case "tingyun":
        writeTingYunFiles(webDir);
        appendEnv(targetDir, tingYunEnvBlock());
        return;
      default:
        return;
    }
  } catch (error) {
    console.error(`Failed to apply monitoring selection "${monitoringId}":`, error);
    throw new Error(`Monitoring scaffold for "${monitoringId}" failed — see stderr for details.`);
  }
}
