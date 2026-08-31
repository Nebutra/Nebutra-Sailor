/**
 * Resources taxonomy — single source of truth for the two-column Resources
 * mega-menu (DEVELOPERS / COMPANY), mirroring the `solutions-data` pattern.
 *
 * Copy is authored inline as `LocalizedCopy` ({ en, zh }) and resolved with
 * `pick()`; the other five routing locales fall back to English, exactly like
 * the Solutions menu — so this needs no edits to the next-intl catalogs (only
 * the `nav.resources` trigger label lives there).
 */

import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import {
  BlendMode,
  BookOpen,
  Briefcase,
  Eye,
  FileText,
  GitPullRequest,
  Globe,
  Lightning,
  Notification,
  Pencil,
  Route,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { type LocalizedCopy, pick } from "@/lib/i18n/localized";

export type { LocalizedCopy };
export { pick };
export type ResourceIcon = ComponentType<{ className?: string }>;
export type ResourceGroupId = "developers" | "company";

export interface ResourceGroup {
  id: ResourceGroupId;
  label: LocalizedCopy;
}

export interface ResourceLink {
  groupId: ResourceGroupId;
  icon: ResourceIcon;
  label: LocalizedCopy;
  tagline: LocalizedCopy;
  href: string;
  /** Opens in a new tab and shows an outbound arrow. */
  external?: boolean;
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  { id: "developers", label: { en: "Developers", zh: "开发者" } },
  { id: "company", label: { en: "Company", zh: "公司" } },
];

export const RESOURCES: ResourceLink[] = [
  // ── Developers ────────────────────────────────────────────────────────────
  {
    groupId: "developers",
    icon: Globe,
    label: { en: "Open Platform", zh: "开放平台" },
    tagline: {
      en: "APIs, docs, and the developer console",
      zh: "API、文档与开发者控制台",
    },
    href: "/open",
  },
  {
    groupId: "developers",
    icon: FileText,
    label: { en: "Docs", zh: "文档" },
    tagline: { en: "API docs and guides", zh: "API 文档与指南" },
    href: createPublicDocsUrl(),
    external: true,
  },
  {
    groupId: "developers",
    icon: Wrench,
    label: { en: "Forge", zh: "Forge 工具站" },
    tagline: {
      en: "Online codecs, text, hashing, and document tools",
      zh: "在线编解码、文本、哈希与文档工具",
    },
    href: getBrandOrigin("forge"),
    external: true,
  },
  {
    groupId: "developers",
    icon: Pencil,
    label: { en: "Blog", zh: "博客" },
    tagline: { en: "Engineering notes and updates", zh: "工程笔记与产品更新" },
    href: "/blog",
  },
  {
    groupId: "developers",
    icon: GitPullRequest,
    label: { en: "Changelog", zh: "更新日志" },
    tagline: { en: `What's new in ${brand.name}`, zh: `${brand.name} 的最新更新` },
    href: "/changelog",
  },
  {
    groupId: "developers",
    icon: Route,
    label: { en: "Roadmap", zh: "路线图" },
    tagline: { en: "See what we're building next", zh: "下一步在建什么" },
    href: "/roadmap",
  },
  {
    groupId: "developers",
    icon: BlendMode,
    label: { en: "Design System", zh: "设计系统" },
    tagline: { en: "Tokens, components, and brand", zh: "令牌、组件与品牌" },
    href: "https://design.nebutra.com",
    external: true,
  },
  {
    groupId: "developers",
    icon: Lightning,
    label: { en: "Status", zh: "服务状态" },
    tagline: { en: "Service status and uptime", zh: "服务状态与可用性" },
    href: "/status",
  },
  // ── Company ────────────────────────────────────────────────────────────────
  {
    groupId: "company",
    icon: Sparkles,
    label: { en: "About", zh: "关于我们" },
    tagline: { en: "Our mission and team", zh: "我们的使命与团队" },
    href: "/about",
  },
  {
    groupId: "company",
    icon: Briefcase,
    label: { en: "Careers", zh: "加入我们" },
    tagline: { en: "Join the team", zh: "招聘职位" },
    href: "/careers",
  },
  {
    groupId: "company",
    icon: Notification,
    label: { en: "Newsroom", zh: "新闻中心" },
    tagline: { en: "Announcements and press", zh: "公告与新闻稿" },
    href: "/news",
  },
  {
    groupId: "company",
    icon: BookOpen,
    label: { en: "Playbook", zh: "实战手册" },
    tagline: { en: "How we build", zh: "我们如何构建" },
    href: "/playbook",
  },
  {
    groupId: "company",
    icon: Eye,
    label: { en: "Showcase", zh: "案例展示" },
    tagline: { en: `Built with ${brand.name}`, zh: `用 ${brand.name} 构建的作品` },
    href: "/showcase",
  },
  {
    groupId: "company",
    icon: ShieldCheck,
    label: { en: "Security", zh: "安全合规" },
    tagline: { en: "Security and compliance", zh: "安全与合规" },
    href: "/security",
  },
];

export function getGroupResources(group: ResourceGroup): ResourceLink[] {
  return RESOURCES.filter((resource) => resource.groupId === group.id);
}
