/**
 * Open platform catalog — public index on landing `/open`
 * (also served as the `open.nebutra.com` host alias).
 *
 * Console mutations stay on `app` (`/settings/developers` and siblings).
 * This file only names existing hosts and settings routes. Copy (eyebrow,
 * title, lead, group/item label + description) lives in
 * `apps/landing/messages/*.json` under the `openPlatform` namespace.
 */

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

export type OpenPlatformGroupId = "catalog" | "console";

export interface OpenPlatformGroup {
  id: OpenPlatformGroupId;
}

export interface OpenPlatformItem {
  id: string;
  group: OpenPlatformGroupId;
  icon: ComponentType<{ className?: string }>;
  href: string;
  /** When true, `href` is relative to the dashboard app domain. */
  app?: boolean;
  /** When true, look up `items.<id>.badge` in the message namespace. */
  badge?: boolean;
}

export const OPEN_PLATFORM_GROUPS: OpenPlatformGroup[] = [{ id: "catalog" }, { id: "console" }];

export const OPEN_PLATFORM_ITEMS: OpenPlatformItem[] = [
  {
    id: "docs",
    group: "catalog",
    icon: BookOpen,
    href: createPublicDocsUrl(),
  },
  {
    id: "api",
    group: "catalog",
    icon: Route,
    href: getBrandOrigin("api"),
  },
  {
    id: "router",
    group: "catalog",
    icon: GitBranch,
    href: getBrandOrigin("router"),
  },
  {
    id: "forge",
    group: "catalog",
    icon: Wrench,
    href: getBrandOrigin("forge"),
  },
  {
    id: "sso",
    group: "catalog",
    icon: Shield,
    href: createPublicDocsUrl("guides/authentication"),
    badge: true,
  },
  {
    id: "status",
    group: "catalog",
    icon: Lightning,
    href: getBrandOrigin("status"),
  },
  {
    id: "api-keys",
    group: "console",
    icon: Key,
    href: "/settings/api-keys",
    app: true,
  },
  {
    id: "webhooks",
    group: "console",
    icon: Notification,
    href: "/settings/webhooks",
    app: true,
  },
  {
    id: "provider-keys",
    group: "console",
    icon: Key,
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
