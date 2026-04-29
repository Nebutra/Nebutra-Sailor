import {
  BookOpen as BookOpenNebutra,
  GitPullRequest,
  LogoGithub,
  Route,
  Sparkles as SparklesNebutra,
  Users,
} from "@nebutra/icons";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Box,
  Cloud,
  CreditCard,
  Database,
  FileCode2,
  FileJson,
  FileTerminal,
  FileText,
  FolderOpen,
  Globe,
  HeartPulse,
  Image as ImageIcon,
  Key,
  Languages,
  LayoutGrid,
  LineChart,
  Lock,
  Mail,
  Megaphone,
  MonitorDot,
  Paintbrush,
  Palette,
  PenTool,
  Scale,
  Server,
  Settings,
  Shield,
  Sparkles,
  Timer,
  ToyBrick,
  Workflow,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import React from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";

export interface FileNode {
  id: string;
  label: string;
  description?: string;
  tag?: string;
  icon?: ReactNode;
  children?: FileNode[];
}

export const TREE_DATA: FileNode[] = [
  {
    id: "apps",
    label: "apps",
    icon: React.createElement(FolderOpen, {
      className: "h-[15px] w-[15px] text-blue-500 fill-blue-500/20",
    }),
    description: "- Application packages (web app, docs, marketing)",
    children: [
      {
        id: "landing",
        label: "landing-page",
        description: "- Public marketing site (next-intl, 7 locales)",
        icon: React.createElement(Megaphone, { className: "h-4 w-4 text-orange-500" }),
      },
      {
        id: "web",
        label: "web",
        description: "- Authenticated SaaS dashboard (Clerk auth)",
        icon: React.createElement(Globe, { className: "h-4 w-4 text-blue-500" }),
      },
      {
        id: "api",
        label: "api-gateway",
        description: "- Backend APIs (Hono + OpenAPI + Zod)",
        icon: React.createElement(Server, { className: "h-4 w-4 text-amber-500" }),
      },
      {
        id: "storybook",
        label: "storybook",
        description: "- Component library documentation",
        icon: React.createElement(BookOpen, { className: "h-4 w-4 text-pink-500" }),
      },
      {
        id: "design-docs",
        label: "design-docs",
        description: "- Internal design documentation (Fumadocs)",
        icon: React.createElement(Paintbrush, { className: "h-4 w-4 text-teal-400" }),
      },
      {
        id: "studio",
        label: "studio",
        description: "- Sanity Studio CMS v5",
        icon: React.createElement(PenTool, { className: "h-4 w-4 text-red-500" }),
      },
      {
        id: "docs",
        label: "sailor-docs",
        description: "- Public product documentation (Fumadocs)",
        icon: React.createElement(FileText, { className: "h-4 w-4 text-blue-400" }),
      },
      {
        id: "idp",
        label: "idp",
        description: "- Identity Provider application",
        icon: React.createElement(Key, { className: "h-4 w-4 text-purple-500" }),
      },
    ],
  },
  {
    id: "packages",
    label: "packages",
    icon: React.createElement(Box, {
      className: "h-[15px] w-[15px] text-emerald-500 fill-emerald-500/20",
    }),
    description: "- Shared packages and libraries used across the monorepo",
    children: [
      {
        id: "ai-sdk",
        label: "ai-sdk",
        description: "- Vercel AI SDK wrapper (OpenAI, OpenRouter)",
        icon: React.createElement(Bot, { className: "h-4 w-4 text-emerald-400" }),
      },
      {
        id: "api",
        label: "api",
        description: "- API definitions and routing",
        icon: React.createElement(FileCode2, { className: "h-4 w-4 text-blue-500" }),
      },
      {
        id: "auth",
        label: "identity",
        description: "- Auth abstraction layer (Clerk adapter)",
        icon: React.createElement(Shield, { className: "h-4 w-4 text-green-500" }),
      },
      {
        id: "db",
        label: "database",
        description: "- Database schema and client setup (Prisma v7)",
        icon: React.createElement(Database, { className: "h-4 w-4 text-indigo-500" }),
      },
      {
        id: "i18n",
        label: "i18n",
        description: "- Translations and localization setup",
        icon: React.createElement(Languages, { className: "h-4 w-4 text-teal-500" }),
      },
      {
        id: "logger",
        label: "logs",
        description: "- Structured logging providers (Sentry)",
        icon: React.createElement(FileText, { className: "h-4 w-4 text-amber-600" }),
      },
      {
        id: "mail",
        label: "email",
        description: "- transactional emails (Resend)",
        icon: React.createElement(Mail, { className: "h-4 w-4 text-red-500" }),
      },
      {
        id: "payments",
        label: "billing",
        description: "- Payment providers and subscriptions (Stripe)",
        icon: React.createElement(CreditCard, { className: "h-4 w-4 text-green-600" }),
      },
      {
        id: "storage",
        label: "storage",
        description: "- S3-compatible file storage",
        icon: React.createElement(Cloud, { className: "h-4 w-4 text-cyan-500" }),
      },
      {
        id: "ui",
        label: "ui",
        description: "- Shared Component library (Radix + framer-motion)",
        icon: React.createElement(LayoutGrid, { className: "h-4 w-4 text-purple-500" }),
      },
      {
        id: "tokens",
        label: "tokens",
        description: "- Runtime CSS variables single source",
        icon: React.createElement(Palette, { className: "h-4 w-4 text-orange-400" }),
      },
      {
        id: "brand",
        label: "brand",
        description: "- Brand primitives (colors, gradients)",
        icon: React.createElement(Sparkles, { className: "h-4 w-4 text-pink-400" }),
      },
      {
        id: "icons",
        label: "icons",
        description: "- Geist icons as TSX components",
        icon: React.createElement(ImageIcon, { className: "h-4 w-4 text-violet-400" }),
      },
      {
        id: "preset",
        label: "preset",
        description: "- Feature-based SaaS starter config",
        icon: React.createElement(Settings, { className: "h-4 w-4 text-slate-500" }),
      },
      {
        id: "analytics",
        label: "analytics",
        description: "- PostHog + Dub.co analytics",
        icon: React.createElement(LineChart, { className: "h-4 w-4 text-rose-500" }),
      },
      {
        id: "audit",
        label: "audit",
        description: "- Audit logging (actor/tenant scoping)",
        icon: React.createElement(Activity, { className: "h-4 w-4 text-indigo-400" }),
      },
      {
        id: "event-bus",
        label: "event-bus",
        description: "- Inngest background jobs",
        icon: React.createElement(Workflow, { className: "h-4 w-4 text-fuchsia-500" }),
      },
      {
        id: "cache",
        label: "cache",
        description: "- Redis caching adapter",
        icon: React.createElement(Zap, { className: "h-4 w-4 text-yellow-500" }),
      },
      {
        id: "rate-limit",
        label: "rate-limit",
        description: "- Token bucket rate limiting",
        icon: React.createElement(Timer, { className: "h-4 w-4 text-slate-400" }),
      },
      {
        id: "alerting",
        label: "alerting",
        description: "- Email + Slack alert system",
        icon: React.createElement(Bell, { className: "h-4 w-4 text-red-400" }),
      },
      {
        id: "errors",
        label: "errors",
        description: "- Typed error definitions",
        icon: React.createElement(AlertTriangle, { className: "h-4 w-4 text-orange-500" }),
      },
      {
        id: "health",
        label: "health",
        description: "- Health check probes",
        icon: React.createElement(HeartPulse, { className: "h-4 w-4 text-rose-400" }),
      },
      {
        id: "contracts",
        label: "contracts",
        description: "- API contract definitions",
        icon: React.createElement(FileCode2, { className: "h-4 w-4 text-cyan-600" }),
      },
      {
        id: "config",
        label: "config",
        description: "- Environment variable validation",
        icon: React.createElement(Settings, { className: "h-4 w-4 text-gray-500" }),
      },
      {
        id: "legal",
        label: "legal",
        description: "- Legal content + GDPR consent",
        icon: React.createElement(Scale, { className: "h-4 w-4 text-slate-600" }),
      },
      {
        id: "marketing",
        label: "marketing",
        description: "- Marketing components",
        icon: React.createElement(Megaphone, { className: "h-4 w-4 text-orange-600" }),
      },
      {
        id: "sanity",
        label: "sanity",
        description: "- Sanity CMS queries",
        icon: React.createElement(MonitorDot, { className: "h-4 w-4 text-red-600" }),
      },
      {
        id: "oauth-server",
        label: "oauth-server",
        description: "- OAuth 2.0 provider",
        icon: React.createElement(Lock, { className: "h-4 w-4 text-slate-700" }),
      },
      {
        id: "mcp",
        label: "mcp",
        description: "- Model Context Protocol server",
        icon: React.createElement(ToyBrick, { className: "h-4 w-4 text-yellow-600" }),
      },
    ],
  },
  {
    id: "tooling",
    label: "tooling",
    icon: React.createElement(FolderOpen, {
      className: "h-[15px] w-[15px] text-zinc-400 fill-zinc-400/20",
    }),
    description: "- Development tooling and configuration",
    children: [
      {
        id: "agents",
        label: "AGENTS.md",
        description: "- Guidelines and conventions for AI",
        icon: React.createElement(FileTerminal, { className: "h-4 w-4 text-green-500" }),
      },
      {
        id: "turbo",
        label: "turbo.json",
        description: "- Pipeline config",
        icon: React.createElement(FileJson, { className: "h-4 w-4 text-pink-500" }),
      },
    ],
  },
];

import { GitBranch, LockClosed, ShieldCheck } from "@nebutra/icons";

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
  { labelKey: "pricing", href: "/pricing" },
  { labelKey: "about", href: "/about" },
  { labelKey: "impact", href: "/impact" },
  {
    labelKey: "resources",
    children: [
      { labelKey: "ideas", href: "/ideas", icon: SparklesNebutra },
      { labelKey: "opc", href: "/about/products", icon: Users },
      { labelKey: "changelog", href: "/changelog", icon: GitPullRequest },
      { labelKey: "roadmap", href: "/roadmap", icon: Route },
      { labelKey: "docs", href: createPublicDocsUrl(), icon: BookOpenNebutra },
    ],
  },
  {
    labelKey: "github",
    href: "https://github.com/Nebutra/Nebutra-Sailor",
    icon: LogoGithub,
  },
] as const;
