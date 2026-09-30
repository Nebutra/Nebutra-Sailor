/**
 * Playbook — a curated directory of the live infrastructure demos, utilities,
 * integration surfaces and experimental features that ship inside the product.
 *
 * Linked from the footer "Resources" column. Entries are grouped by category
 * and rendered by `app/[lang]/(marketing)/playbook/page.tsx`. Structure only —
 * copy (category/item label + description) lives in
 * `apps/landing/messages/*.json` under the `playbookCatalog` namespace.
 *
 * `href` is either an absolute external URL or an app-relative path. App-relative
 * paths are resolved against NEXT_PUBLIC_APP_URL at render time (see `resolvePlaybookHref`),
 * so demos that live on the authenticated dashboard open on the app domain.
 */

import { Box, Brain, Code, Command, Droplet, Eye, Layers, Play, Sparkles } from "@nebutra/icons";
import type { ComponentType } from "react";
import { env } from "@/lib/env";

export type PlaybookCategoryId = "ai" | "design" | "compose" | "os";

export interface PlaybookCategory {
  id: PlaybookCategoryId;
}

export interface PlaybookItem {
  id: string;
  category: PlaybookCategoryId;
  icon: ComponentType<{ className?: string }>;
  /** Absolute URL, or an app-relative path resolved against NEXT_PUBLIC_APP_URL. */
  href: string;
  /** When true, `href` is relative to the dashboard app domain. */
  app?: boolean;
  /** Opens in a new tab (always true for app + absolute links). */
  external?: boolean;
  /** When true, look up `items.<id>.badge` in the message namespace. */
  badge?: boolean;
}

export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  { id: "ai" },
  { id: "design" },
  { id: "compose" },
  { id: "os" },
];

export const PLAYBOOK_ITEMS: PlaybookItem[] = [
  // AI & Agents
  {
    id: "layer0",
    category: "ai",
    icon: Layers,
    href: "/demo/layer0",
    app: true,
  },
  {
    id: "agent-runtime",
    category: "ai",
    icon: Brain,
    href: "/demo/agent-runtime",
    app: true,
  },
  {
    id: "cinema",
    category: "ai",
    icon: Play,
    href: "/demo/cinema",
    app: true,
  },
  // Design & Theming
  {
    id: "sailor-studio",
    category: "design",
    icon: Sparkles,
    href: "/sailor/studio",
    app: false,
  },
  {
    id: "color-tokens",
    category: "design",
    icon: Droplet,
    href: "https://design.nebutra.com/en/docs/foundations/brand-colors",
    external: true,
  },
  {
    id: "icon-library",
    category: "design",
    icon: Eye,
    href: "https://design.nebutra.com/en/docs/foundations/icons",
    external: true,
  },
  // Embedding & Composition
  {
    id: "canvas",
    category: "compose",
    icon: Box,
    href: "/demo/canvas",
    app: true,
  },
  {
    id: "embed",
    category: "compose",
    icon: Code,
    href: "/demo/embed",
    app: true,
  },
  // The OS
  {
    id: "startup-os",
    category: "os",
    icon: Command,
    href: "/startup-os",
    app: true,
    badge: true,
  },
];

/** Resolve an item's link to a fully-qualified, navigable URL. */
export function resolvePlaybookHref(item: PlaybookItem): string {
  if (!item.app) return item.href;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}${item.href}`;
}

/** App-domain and absolute links open in a new tab; in-site routes do not. */
export function isPlaybookExternal(item: PlaybookItem): boolean {
  return item.external ?? (item.app === true || item.href.startsWith("http"));
}
