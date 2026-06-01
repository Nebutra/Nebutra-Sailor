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

import { Box, Brain, Code, Command, Droplet, Eye, Layers, Play, Sparkles } from "@nebutra/icons";
import type { ComponentType } from "react";
import { env } from "@/lib/env";
import type { LocalizedCopy } from "@/lib/i18n/localized";

export type PlaybookCategoryId = "ai" | "design" | "compose" | "os";

export interface PlaybookCategory {
  id: PlaybookCategoryId;
  label: LocalizedCopy;
  description: LocalizedCopy;
}

export interface PlaybookItem {
  id: string;
  category: PlaybookCategoryId;
  icon: ComponentType<{ className?: string }>;
  title: LocalizedCopy;
  description: LocalizedCopy;
  /** Absolute URL, or an app-relative path resolved against NEXT_PUBLIC_APP_URL. */
  href: string;
  /** When true, `href` is relative to the dashboard app domain. */
  app?: boolean;
  /** Opens in a new tab (always true for app + absolute links). */
  external?: boolean;
  badge?: LocalizedCopy;
}

export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  {
    id: "ai",
    label: { en: "AI & Agents", zh: "AI 与 Agent" },
    description: {
      en: "Agentic runtimes and multi-step pipelines you can watch run end-to-end.",
      zh: "可观察其端到端运行的 agent 运行时与多步流水线。",
    },
  },
  {
    id: "design",
    label: { en: "Design & Theming", zh: "设计与主题" },
    description: {
      en: "Shape the brand system — palette, type, motion — and preview it live.",
      zh: "塑造品牌系统——调色板、字体、动效——并实时预览。",
    },
  },
  {
    id: "compose",
    label: { en: "Embedding & Composition", zh: "嵌入与编排" },
    description: {
      en: "Compose workflows visually and embed Sailor surfaces anywhere.",
      zh: "可视化编排工作流,并把 Sailor 界面嵌入任意位置。",
    },
  },
  {
    id: "os",
    label: { en: "The OS", zh: "操作系统" },
    description: {
      en: "Opinionated operating surfaces built on top of the platform.",
      zh: "构建在平台之上的一体化操作面板。",
    },
  },
];

export const PLAYBOOK_ITEMS: PlaybookItem[] = [
  // AI & Agents
  {
    id: "layer0",
    category: "ai",
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
    category: "ai",
    icon: Brain,
    title: { en: "Agent Runtime Grammar", zh: "Agent Runtime 语法" },
    description: {
      en: "The multi-step agent runtime — tool registry, streaming UI, MCP integration.",
      zh: "多步骤 agent 运行时——tool registry、流式 UI、MCP 接入。",
    },
    href: "/demo/agent-runtime",
    app: true,
  },
  {
    id: "cinema",
    category: "ai",
    icon: Play,
    title: { en: "Cinema — Film-Director Pipeline", zh: "Cinema 电影导演流水线" },
    description: {
      en: "A multi-agent pipeline that storyboards, shoots and cuts a short film.",
      zh: "把分镜、拍摄、剪辑串成一条多 agent 流水线的短片生成。",
    },
    href: "/demo/cinema",
    app: true,
  },
  // Design & Theming
  {
    id: "theme-playground",
    category: "design",
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
    id: "color-tokens",
    category: "design",
    icon: Droplet,
    title: { en: "Color & Tokens", zh: "色彩与 Token" },
    description: {
      en: "Browse the 12-step brand color scales and the live design-token reference.",
      zh: "浏览 12 阶品牌色阶与实时设计 token 参考。",
    },
    href: "https://design.nebutra.com/en/docs/foundations/brand-colors",
    external: true,
  },
  {
    id: "icon-library",
    category: "design",
    icon: Eye,
    title: { en: "Icon Library", zh: "图标库" },
    description: {
      en: "Browse all 541 Geist icons as tree-shakable, single-weight TSX components.",
      zh: "浏览全部 541 个 Geist 图标——tree-shakable、单字重 TSX 组件。",
    },
    href: "https://design.nebutra.com/en/docs/foundations/icons",
    external: true,
  },
  // Embedding & Composition
  {
    id: "canvas",
    category: "compose",
    icon: Box,
    title: { en: "Canvas — Node-Graph Editor", zh: "Canvas 节点图编辑器" },
    description: {
      en: "An infinite node-graph canvas for composing agent workflows visually.",
      zh: "用于可视化编排 agent 工作流的无限节点图画布。",
    },
    href: "/demo/canvas",
    app: true,
  },
  {
    id: "embed",
    category: "compose",
    icon: Code,
    title: { en: "Embed Demo", zh: "嵌入 Demo" },
    description: {
      en: "Drop a Sailor surface into any page with a single embed snippet.",
      zh: "用一段嵌入代码把 Sailor 界面塞进任意页面。",
    },
    href: "/demo/embed",
    app: true,
  },
  // The OS
  {
    id: "startup-os",
    category: "os",
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
