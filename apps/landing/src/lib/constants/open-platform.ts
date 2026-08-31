/**
 * Open platform catalog — public index on landing `/open`
 * (also served as the `open.nebutra.com` host alias).
 *
 * Console mutations stay on `app` (`/settings/developers` and siblings).
 * This file only names existing hosts and settings routes.
 */

import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import {
  BookOpen,
  GitBranch,
  Key,
  Lightning,
  Notification,
  Route,
  Shield,
  Wrench,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { env } from "@/lib/env";
import type { LocalizedCopy } from "@/lib/i18n/localized";

export type OpenPlatformGroupId = "catalog" | "console";

export interface OpenPlatformGroup {
  id: OpenPlatformGroupId;
  label: LocalizedCopy;
  description: LocalizedCopy;
}

export interface OpenPlatformItem {
  id: string;
  group: OpenPlatformGroupId;
  icon: ComponentType<{ className?: string }>;
  title: LocalizedCopy;
  description: LocalizedCopy;
  href: string;
  /** When true, `href` is relative to the dashboard app domain. */
  app?: boolean;
  badge?: LocalizedCopy;
}

export const OPEN_PLATFORM_COPY = {
  eyebrow: { en: "Open Platform", zh: "开放平台" },
  title: { en: `${brand.name} Open Platform`, zh: `${brand.nameCn}开放平台` },
  lead: {
    en: "Docs, public APIs, and the signed-in developer console — one catalog, no second origin.",
    zh: "文档、公开 API 与登录后的开发者控制台，集中在这一处，不另开源站。",
  },
  consoleCta: { en: "Open the console", zh: "打开控制台" },
  consoleHint: {
    en: "API keys, webhooks, and provider keys stay on the app. Sign in if you are asked.",
    zh: "密钥、Webhook 与供应商密钥仍在应用里。未登录时会先走到登录。",
  },
} as const satisfies Record<string, LocalizedCopy>;

export const OPEN_PLATFORM_GROUPS: OpenPlatformGroup[] = [
  {
    id: "catalog",
    label: { en: "Public surfaces", zh: "公开面" },
    description: {
      en: "Hosts that already exist. This page does not proxy them.",
      zh: "已经在跑的主机。本页只做索引，不代发请求。",
    },
  },
  {
    id: "console",
    label: { en: "Developer console", zh: "开发者控制台" },
    description: {
      en: "Signed-in settings on the app. Create and revoke credentials there.",
      zh: "登录后在应用设置里创建、吊销凭证。",
    },
  },
];

export const OPEN_PLATFORM_ITEMS: OpenPlatformItem[] = [
  {
    id: "docs",
    group: "catalog",
    icon: BookOpen,
    title: { en: "Docs", zh: "文档" },
    description: {
      en: "Guides, API reference, and webhook contracts.",
      zh: "指南、API 参考与 Webhook 契约。",
    },
    href: createPublicDocsUrl(),
  },
  {
    id: "api",
    group: "catalog",
    icon: Route,
    title: { en: "API", zh: "API" },
    description: {
      en: "Shared gateway. Product namespaces stay under /<product>/v1/*.",
      zh: "共享网关。产品命名空间落在 /<product>/v1/*。",
    },
    href: getBrandOrigin("api"),
  },
  {
    id: "router",
    group: "catalog",
    icon: GitBranch,
    title: { en: "Router", zh: "Router" },
    description: {
      en: "OpenAI-compatible model edge.",
      zh: "兼容 OpenAI 的模型边。",
    },
    href: getBrandOrigin("router"),
  },
  {
    id: "forge",
    group: "catalog",
    icon: Wrench,
    title: { en: "Forge", zh: "Forge" },
    description: {
      en: "Tool station and agent invoke API.",
      zh: "工具站与 Agent 调用 API。",
    },
    href: getBrandOrigin("forge"),
  },
  {
    id: "sso",
    group: "catalog",
    icon: Shield,
    title: { en: `Sign in with ${brand.name}`, zh: `使用${brand.nameCn}登录` },
    description: {
      en: "OIDC issuer on sso. Client registration is not self-serve yet.",
      zh: "OIDC 签发在 sso。第三方应用注册尚未自助开通。",
    },
    href: createPublicDocsUrl("guides/authentication"),
    badge: { en: "IdP", zh: "IdP" },
  },
  {
    id: "status",
    group: "catalog",
    icon: Lightning,
    title: { en: "Status", zh: "服务状态" },
    description: {
      en: "Live operational status for public hosts.",
      zh: "公开主机的运行状态。",
    },
    href: getBrandOrigin("status"),
  },
  {
    id: "api-keys",
    group: "console",
    icon: Key,
    title: { en: "API keys", zh: "API 密钥" },
    description: {
      en: "Create and revoke programmatic keys for the gateway.",
      zh: "创建、吊销网关的程序化密钥。",
    },
    href: "/settings/api-keys",
    app: true,
  },
  {
    id: "webhooks",
    group: "console",
    icon: Notification,
    title: { en: "Webhooks", zh: "Webhooks" },
    description: {
      en: "Subscribe to workspace events. Payloads are signed.",
      zh: "订阅工作区事件。载荷带签名。",
    },
    href: "/settings/webhooks",
    app: true,
  },
  {
    id: "provider-keys",
    group: "console",
    icon: Key,
    title: { en: "Provider keys", zh: "供应商密钥" },
    description: {
      en: "Bring your own AI provider credentials.",
      zh: "接入自有 AI 供应商凭证。",
    },
    href: "/settings/provider-keys",
    app: true,
  },
];

export const OPEN_PLATFORM_CONSOLE_HREF = "/settings/developers";

export function resolveOpenPlatformHref(item: Pick<OpenPlatformItem, "href" | "app">): string {
  if (!item.app) return item.href;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}${item.href}`;
}

export function resolveOpenPlatformConsoleHref(): string {
  return resolveOpenPlatformHref({ href: OPEN_PLATFORM_CONSOLE_HREF, app: true });
}

export function isOpenPlatformExternal(item: OpenPlatformItem): boolean {
  return item.app === true || item.href.startsWith("http");
}
