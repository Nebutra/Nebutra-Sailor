/**
 * Playbook — a curated directory of the live infrastructure demos, utilities,
 * integration surfaces and experimental features that ship inside the product.
 *
 * Linked from the footer "Resources" column. Entries are grouped by category
 * and rendered by `app/[lang]/(marketing)/playbook/page.tsx`.
 *
 * `href` is either an absolute external URL or an app-relative path. App-relative
 * paths are resolved against NEXT_PUBLIC_APP_URL at render time (see `resolvePlaybookHref`),
 * so demos that live on the authenticated dashboard open on the app domain.
 */

import { Box, Brain, Code, Command, Compass, Layers, Play, Puzzle, Sparkles } from "@nebutra/icons";
import type { ComponentType } from "react";
import { env } from "@/lib/env";

type Bilingual = { en: string; zh: string };

export type PlaybookCategoryId = "infra" | "fancy" | "tools" | "integrations" | "experimental";

export interface PlaybookCategory {
  id: PlaybookCategoryId;
  label: Bilingual;
  description: Bilingual;
}

export interface PlaybookItem {
  id: string;
  category: PlaybookCategoryId;
  icon: ComponentType<{ className?: string }>;
  title: Bilingual;
  description: Bilingual;
  /** Absolute URL, or an app-relative path resolved against NEXT_PUBLIC_APP_URL. */
  href: string;
  /** When true, `href` is relative to the dashboard app domain. */
  app?: boolean;
  /** Opens in a new tab (always true for app + absolute links). */
  external?: boolean;
  badge?: Bilingual;
}

export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  {
    id: "infra",
    label: { en: "Infrastructure Demos", zh: "基础设施 Demo" },
    description: {
      en: "See the building blocks that power Sailor running end-to-end.",
      zh: "看 Sailor 底座的基础组件端到端跑起来。",
    },
  },
  {
    id: "fancy",
    label: { en: "Showpiece Demos", zh: "Fancy Demo" },
    description: {
      en: "The flagship interactions we built to push the platform.",
      zh: "为了把平台推到极限而打造的旗舰交互。",
    },
  },
  {
    id: "tools",
    label: { en: "Utilities", zh: "实用工具" },
    description: {
      en: "Standalone tools you can use without writing any code.",
      zh: "无需写代码即可直接上手的独立小工具。",
    },
  },
  {
    id: "integrations",
    label: { en: "Integration Surfaces", zh: "集成能力" },
    description: {
      en: "The provider-agnostic packages you swap without rewrites.",
      zh: "可无重写替换的 provider 无关能力包。",
    },
  },
  {
    id: "experimental",
    label: { en: "Experimental", zh: "实验性功能" },
    description: {
      en: "Early-access work in progress — shapes may change.",
      zh: "抢先体验、仍在打磨的功能——形态可能变化。",
    },
  },
];

export const PLAYBOOK_ITEMS: PlaybookItem[] = [
  // Infrastructure demos — live on the dashboard app
  {
    id: "layer0",
    category: "infra",
    icon: Layers,
    title: { en: "Layer 0 Capability Loop", zh: "Layer 0 能力回环" },
    description: {
      en: "Watch a capability request travel the full perceive → plan → act → verify loop.",
      zh: "观察一次能力请求走完 感知 → 规划 → 执行 → 校验 的完整回环。",
    },
    href: "/demo/layer0",
    app: true,
  },
  {
    id: "agent-runtime",
    category: "infra",
    icon: Brain,
    title: { en: "Agent Runtime Grammar", zh: "Agent Runtime 语法" },
    description: {
      en: "The multi-step agent runtime — tool registry, streaming UI, MCP integration.",
      zh: "多步骤 agent 运行时——tool registry、流式 UI、MCP 接入。",
    },
    href: "/demo/agent-runtime",
    app: true,
  },
  // Showpiece demos
  {
    id: "cinema",
    category: "fancy",
    icon: Play,
    title: { en: "Cinema — Film-Director Pipeline", zh: "Cinema 电影导演流水线" },
    description: {
      en: "A multi-agent pipeline that storyboards, shoots and cuts a short film.",
      zh: "把分镜、拍摄、剪辑串成一条多 agent 流水线的短片生成。",
    },
    href: "/demo/cinema",
    app: true,
  },
  {
    id: "canvas",
    category: "fancy",
    icon: Box,
    title: { en: "Canvas — Node-Graph Editor", zh: "Canvas 节点图编辑器" },
    description: {
      en: "An infinite node-graph canvas for composing agent workflows visually.",
      zh: "用于可视化编排 agent 工作流的无限节点图画布。",
    },
    href: "/demo/canvas",
    app: true,
  },
  // Utilities
  {
    id: "theme-playground",
    category: "tools",
    icon: Sparkles,
    title: { en: "Theme Playground", zh: "主题游乐场" },
    description: {
      en: "Tune palette, typography and motion presets and preview them live.",
      zh: "实时调试调色板、字体与动效 preset 并即时预览。",
    },
    href: "/theme-playground",
    app: true,
  },
  {
    id: "embed",
    category: "tools",
    icon: Code,
    title: { en: "Embed Demo", zh: "嵌入 Demo" },
    description: {
      en: "Drop a Sailor surface into any page with a single embed snippet.",
      zh: "用一段嵌入代码把 Sailor 界面塞进任意页面。",
    },
    href: "/demo/embed",
    app: true,
  },
  // Integration surfaces — public marketing routes
  {
    id: "packages",
    category: "integrations",
    icon: Puzzle,
    title: { en: "Package Directory", zh: "能力包目录" },
    description: {
      en: "Browse every provider-agnostic package — auth, billing, queue, search, more.",
      zh: "浏览全部 provider 无关能力包——鉴权、计费、队列、搜索等。",
    },
    href: "/features",
  },
  {
    id: "solutions",
    category: "integrations",
    icon: Compass,
    title: { en: "Solutions", zh: "解决方案" },
    description: {
      en: "How the pieces compose into end-to-end solutions for each use case.",
      zh: "这些能力如何组合成面向各场景的端到端方案。",
    },
    href: "/solutions",
  },
  // Experimental
  {
    id: "startup-os",
    category: "experimental",
    icon: Command,
    title: { en: "Startup OS", zh: "Startup OS" },
    description: {
      en: "An opinionated operating surface for running a startup on Sailor.",
      zh: "在 Sailor 上经营一家创业公司的一体化操作面板。",
    },
    href: "/startup-os",
    app: true,
    badge: { en: "Alpha", zh: "Alpha" },
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
