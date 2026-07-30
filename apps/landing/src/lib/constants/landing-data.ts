import {
  BookOpen,
  Robot as Bot,
  Box,
  CreditCard,
  Database,
  Code as FileCode2,
  AcronymJson as FileJson,
  TerminalWindow as FileTerminal,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Key,
  LockClosed,
  LogoGithub,
  Envelope as Mail,
  Notification as Megaphone,
  Box as Package,
  BlendMode as Palette,
  Pen as PenTool,
  Servers as Server,
  SettingsGear as Settings,
  Shield,
  ShieldCheck,
  Users,
  Workflow,
} from "@nebutra/icons";
import { PaintBrush as Paintbrush } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import React from "react";

export interface FileNode {
  id: string;
  label: string;
  path?: string;
  featureAnchor?: string;
  description?: string;
  tag?: string;
  icon?: ReactNode;
  children?: FileNode[];
}

const packageIcon = (className = "h-4 w-4 text-zinc-500") =>
  React.createElement(Package, { className });

const packageNode = (group: string, name: string, description?: string): FileNode => ({
  id: `packages-${group}-${name}`,
  label: name,
  path: `packages/${group}/${name}`,
  description,
  icon: packageIcon(),
});

const packageGroups = [
  {
    id: "ai",
    featureAnchor: "capability-ai",
    description: "- Agent runtimes, RAG, media pipelines, and provider tooling",
    icon: React.createElement(Bot, { className: "h-4 w-4 text-emerald-400" }),
    children: [
      "3d-pipeline",
      "agent-runtime",
      "agents",
      "ai-primitives",
      "ai-providers",
      "atelier-canvas",
      "audio-pipeline",
      "brand-genesis",
      "browser-control",
      "cinema",
      "code-execution",
      "code-index",
      "cofounder-match",
      "content-store",
      "document-pipeline",
      "ecosystem-safety",
      "event-log",
      "execution-policy",
      "founder-cemetery",
      "generation-context",
      "idea-plaza",
      "image-pipeline",
      "knowledge-base",
      "knowledge-graph",
      "knowledge-rag",
      "landing-builder",
      "local-embedding",
      "mcp",
      "outreach-engine",
      "play-loader",
      "play-marketplace",
      "reel",
      "sandbox-runtime",
      "support-deflector",
      "time-machine",
      "tool-registry",
      "video-pipeline",
      "voice-realtime",
    ],
  },
  {
    id: "commerce",
    featureAnchor: "capability-commerce",
    description: "- Access, billing, license, marketing, and metering contracts",
    icon: React.createElement(CreditCard, { className: "h-4 w-4 text-green-600" }),
    children: [
      "access-gate",
      "billing",
      "blog",
      "contracts",
      "legal",
      "license",
      "marketing",
      "metering",
      "waitlist",
    ],
  },
  {
    id: "design",
    featureAnchor: "capability-design",
    description: "- Brand, tokens, icons, theme, and UI system packages",
    icon: React.createElement(Palette, { className: "h-4 w-4 text-orange-400" }),
    children: ["brand", "design-sync", "design-tokens", "fonts", "icons", "theme", "tokens", "ui"],
  },
  {
    id: "iam",
    featureAnchor: "capability-iam",
    description: "- Auth, identity, permissions, tenancy, audit, and secrets",
    icon: React.createElement(Shield, { className: "h-4 w-4 text-green-500" }),
    children: [
      "audit",
      "auth",
      "captcha",
      "identity",
      "oauth-server",
      "permissions",
      "tenant",
      "vault",
    ],
  },
  {
    id: "integrations",
    featureAnchor: "capability-integrations",
    description: "- Cache, queues, search, messaging, storage, and webhooks",
    icon: React.createElement(Workflow, { className: "h-4 w-4 text-fuchsia-500" }),
    children: [
      "admin-tooling",
      "cache",
      "collab",
      "email",
      "event-bus",
      "integration-vault",
      "notifications",
      "onboarding",
      "queue",
      "saga",
      "search",
      "sms",
      "storage",
      "tts",
      "uploads",
      "video-compose",
      "webhooks",
    ],
  },
  {
    id: "ops",
    description: "- CLI, create-sailor, presets, Sanity, Supabase, compliance",
    icon: React.createElement(Settings, { className: "h-4 w-4 text-slate-500" }),
    children: ["china-compliance", "cli", "create-sailor", "preset", "sanity", "supabase"],
  },
  {
    id: "platform",
    featureAnchor: "capability-platform",
    description: "- Core platform services, data, config, health, and tenancy",
    icon: React.createElement(Database, { className: "h-4 w-4 text-indigo-500" }),
    children: [
      "alerting",
      "analytics",
      "capability-kit",
      "config",
      "db",
      "errors",
      "feature-flags",
      "gateway-core",
      "graph-model",
      "health",
      "i18n",
      "logger",
      "provider-factory",
      "rate-limit",
      "repositories",
      "status",
      "tenant-store",
      "trace-store",
    ],
  },
] as const;

export const TREE_DATA: FileNode[] = [
  {
    id: "apps",
    label: "apps",
    path: "apps",
    tag: "16",
    icon: React.createElement(FolderOpen, {
      className: "h-[15px] w-[15px] text-blue-500 fill-blue-500/20",
    }),
    description: "- Workspace applications",
    children: [
      {
        id: "apps-admin",
        label: "admin",
        path: "apps/admin",
        description: "- Internal control plane (admin.nebutra.com)",
        icon: React.createElement(Shield, { className: "h-4 w-4 text-rose-500" }),
      },
      {
        id: "apps-auth",
        label: "auth",
        path: "apps/auth",
        description: "- Login center for all first-party apps",
        icon: React.createElement(Key, { className: "h-4 w-4 text-amber-500" }),
      },
      {
        id: "apps-design",
        label: "design",
        path: "apps/design",
        description: "- Live design system surface (tokens + components)",
        icon: React.createElement(Paintbrush, { className: "h-4 w-4 text-teal-400" }),
      },
      {
        id: "apps-design-docs",
        label: "design-docs",
        path: "apps/design-docs",
        description: "- Internal design docs (Next.js + Fumadocs)",
        icon: React.createElement(Paintbrush, { className: "h-4 w-4 text-teal-400" }),
      },
      {
        id: "apps-idp",
        label: "idp",
        path: "apps/idp",
        description: "- OAuth 2.0 / OpenID Connect provider",
        icon: React.createElement(Key, { className: "h-4 w-4 text-purple-500" }),
      },
      {
        id: "apps-forge",
        label: "forge",
        path: "apps/forge",
        description: "- Human tool station + Agent invoke API",
        icon: React.createElement(Settings, { className: "h-4 w-4 text-cyan-500" }),
      },
      {
        id: "apps-landing",
        label: "landing",
        path: "apps/landing",
        description: "- Public marketing site (next-intl, 7 locales)",
        icon: React.createElement(Megaphone, { className: "h-4 w-4 text-orange-500" }),
      },
      {
        id: "apps-mail-preview",
        label: "mail-preview",
        path: "apps/mail-preview",
        description: "- Email template preview and export surface",
        icon: React.createElement(Mail, { className: "h-4 w-4 text-red-500" }),
      },
      {
        id: "apps-pebble",
        label: "pebble",
        path: "apps/pebble",
        description: "- Pebble brand front and support intake",
        icon: React.createElement(Megaphone, { className: "h-4 w-4 text-orange-500" }),
      },
      {
        id: "apps-router",
        label: "router",
        path: "apps/router",
        description: "- OpenAI-compatible model relay",
        icon: React.createElement(GitBranch, { className: "h-4 w-4 text-violet-500" }),
      },
      {
        id: "apps-sailor-docs",
        label: "sailor-docs",
        path: "apps/sailor-docs",
        description: "- Public product documentation (Fumadocs)",
        icon: React.createElement(FileText, { className: "h-4 w-4 text-blue-400" }),
      },
      {
        id: "apps-sleptons",
        label: "sleptons",
        path: "apps/sleptons",
        description: "- Community and license-facing product surface",
        icon: React.createElement(Users, { className: "h-4 w-4 text-lime-500" }),
      },
      {
        id: "apps-storybook",
        label: "storybook",
        path: "apps/storybook",
        description: "- Component library documentation",
        icon: React.createElement(BookOpen, { className: "h-4 w-4 text-pink-500" }),
      },
      {
        id: "apps-studio",
        label: "studio",
        path: "apps/studio",
        description: "- Sanity Studio CMS v5",
        icon: React.createElement(PenTool, { className: "h-4 w-4 text-red-500" }),
      },
      {
        id: "apps-typelens",
        label: "typelens",
        path: "apps/typelens",
        description: "- Type specimen collection UI",
        icon: React.createElement(FileText, { className: "h-4 w-4 text-lime-500" }),
      },
      {
        id: "apps-web",
        label: "web",
        path: "apps/web",
        description: "- Authenticated SaaS dashboard",
        icon: React.createElement(Globe, { className: "h-4 w-4 text-blue-500" }),
      },
    ],
  },
  {
    id: "backends",
    label: "backends",
    path: "backends",
    tag: "4",
    icon: React.createElement(Server, {
      className: "h-[15px] w-[15px] text-amber-500 fill-amber-500/20",
    }),
    description: "- Polyglot backend services split by runtime",
    children: [
      {
        id: "backends-gateway",
        label: "gateway",
        path: "backends/gateway",
        featureAnchor: "capability-gateway",
        description: "- TypeScript / Hono BFF, auth, tenancy, OpenAPI",
        icon: React.createElement(Server, { className: "h-4 w-4 text-amber-500" }),
      },
      {
        id: "backends-go",
        label: "go",
        path: "backends/go",
        description: "- Go services, including event ingestion",
        icon: React.createElement(FileCode2, { className: "h-4 w-4 text-cyan-500" }),
      },
      {
        id: "backends-python",
        label: "python",
        path: "backends/python",
        description: "- FastAPI / ML / LLM batch work",
        icon: React.createElement(FileCode2, { className: "h-4 w-4 text-blue-500" }),
      },
      {
        id: "backends-rust",
        label: "rust",
        path: "backends/rust",
        description: "- Rust sandbox runtime work",
        icon: React.createElement(FileCode2, { className: "h-4 w-4 text-orange-600" }),
      },
    ],
  },
  {
    id: "packages",
    label: "packages",
    path: "packages",
    tag: "104",
    icon: React.createElement(Box, {
      className: "h-[15px] w-[15px] text-emerald-500 fill-emerald-500/20",
    }),
    description: "- Domain-grouped workspace packages",
    children: packageGroups.map((group) => ({
      id: `packages-${group.id}`,
      label: group.id,
      path: `packages/${group.id}`,
      featureAnchor: "featureAnchor" in group ? group.featureAnchor : undefined,
      tag: String(group.children.length),
      description: group.description,
      icon: group.icon,
      children: group.children.map((name) => packageNode(group.id, name)),
    })),
  },
  {
    id: "tooling",
    label: "tooling",
    path: ".",
    tag: "5",
    icon: React.createElement(FolderOpen, {
      className: "h-[15px] w-[15px] text-zinc-400 fill-zinc-400/20",
    }),
    description: "- Development tooling and configuration",
    children: [
      {
        id: "agents",
        label: "AGENTS.md",
        path: "AGENTS.md",
        description: "- Guidelines and conventions for AI",
        icon: React.createElement(FileTerminal, { className: "h-4 w-4 text-green-500" }),
      },
      {
        id: "workspace",
        label: "pnpm-workspace.yaml",
        path: "pnpm-workspace.yaml",
        description: "- Workspace package globs and catalog versions",
        icon: React.createElement(FileJson, { className: "h-4 w-4 text-cyan-500" }),
      },
      {
        id: "turbo",
        label: "turbo.json",
        path: "turbo.json",
        description: "- Pipeline config",
        icon: React.createElement(FileJson, { className: "h-4 w-4 text-pink-500" }),
      },
      {
        id: "biome",
        label: "biome.json",
        path: "biome.json",
        description: "- Formatter and lint configuration",
        icon: React.createElement(FileJson, { className: "h-4 w-4 text-indigo-500" }),
      },
      {
        id: "github-workflows",
        label: ".github/workflows",
        path: ".github/workflows",
        description: "- CI, release, security, and deployment workflows",
        icon: React.createElement(GitBranch, { className: "h-4 w-4 text-slate-500" }),
      },
    ],
  },
];

export const HARNESS_STATS = [
  { valueKey: "stat1Value", labelKey: "stat1Label" },
  { valueKey: "stat2Value", labelKey: "stat2Label" },
  { valueKey: "stat3Value", labelKey: "stat3Label" },
] as const;

export const HARNESS_PIPELINE_STEPS = ["lint", "build", "test", "scan", "deploy"] as const;

export const HARNESS_RATCHET_BARS = [
  { label: "oklch", current: 142, floor: 120, pass: true },
  { label: "hex", current: 28, ceiling: 40, pass: true },
] as const;

export const HARNESS_CODE_LINES = [
  { text: 'test("no hardcoded hex in components", () => {', type: "code" as const },
  { text: "  fc.assert(", type: "key" as const },
  { text: "    fc.property(componentFiles, (file) =>", type: "code" as const },
  { text: "      !file.match(/#[0-9a-f]{3,8}/i)", type: "key" as const },
  { text: "    )", type: "code" as const },
  { text: "  );", type: "code" as const },
  { text: "});", type: "code" as const },
];

export const HARNESS_CARDS = [
  {
    titleKey: "card1Title",
    descKey: "card1Desc",
    Icon: ShieldCheck,
  },
  {
    titleKey: "card2Title",
    descKey: "card2Desc",
    Icon: LockClosed,
  },
  {
    titleKey: "card3Title",
    descKey: "card3Desc",
    Icon: GitBranch,
  },
] as const;

export const NAV_LINKS = [
  { labelKey: "features", href: "/features" },
  { labelKey: "solutions", mega: true },
  { labelKey: "pricing", href: "/pricing" },
  { labelKey: "about", href: "/about" },
  // Two-column mega menu (DEVELOPERS / COMPANY) — content lives in
  // `resources-data.ts`, rendered by ResourcesMegaMenu / MobileDrawer.
  { labelKey: "resources", mega: true },
  {
    labelKey: "npm",
    href: "https://www.npmjs.com/package/create-sailor",
    icon: Package,
  },
  {
    labelKey: "github",
    href: "https://github.com/Nebutra/Nebutra-Sailor",
    icon: LogoGithub,
  },
] as const;
