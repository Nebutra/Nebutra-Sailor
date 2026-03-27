"use client";

import {
  TreeExpander,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@nebutra/ui/primitives";
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
  LucideIcon,
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
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AnimateIn } from "./AnimateIn";

interface FileNode {
  id: string;
  label: string;
  description?: string;
  tag?: string;
  icon?: ReactNode;
  children?: FileNode[];
}

const TREE_DATA: FileNode[] = [
  {
    id: "apps",
    label: "apps",
    icon: <FolderOpen className="h-[15px] w-[15px] text-blue-500 fill-blue-500/20" />,
    description: "- Application packages (web app, docs, marketing)",
    children: [
      {
        id: "landing",
        label: "landing-page",
        description: "- Public marketing site (next-intl, 7 locales)",
        icon: <Megaphone className="h-4 w-4 text-orange-500" />,
      },
      {
        id: "web",
        label: "web",
        description: "- Authenticated SaaS dashboard (Clerk auth)",
        icon: <Globe className="h-4 w-4 text-blue-500" />,
      },
      {
        id: "api",
        label: "api-gateway",
        description: "- Backend APIs (Hono + OpenAPI + Zod)",
        icon: <Server className="h-4 w-4 text-amber-500" />,
      },
      {
        id: "storybook",
        label: "storybook",
        description: "- Component library documentation",
        icon: <BookOpen className="h-4 w-4 text-pink-500" />,
      },
      {
        id: "design-docs",
        label: "design-docs",
        description: "- Internal design documentation (Fumadocs)",
        icon: <Paintbrush className="h-4 w-4 text-teal-400" />,
      },
      {
        id: "studio",
        label: "studio",
        description: "- Sanity Studio CMS v5",
        icon: <PenTool className="h-4 w-4 text-red-500" />,
      },
      {
        id: "docs",
        label: "docs",
        description: "- Public product documentation (Mintlify)",
        icon: <FileText className="h-4 w-4 text-blue-400" />,
      },
      {
        id: "idp",
        label: "idp",
        description: "- Identity Provider application",
        icon: <Key className="h-4 w-4 text-purple-500" />,
      },
    ],
  },
  {
    id: "packages",
    label: "packages",
    icon: <Box className="h-[15px] w-[15px] text-emerald-500 fill-emerald-500/20" />,
    description: "- Shared packages and libraries used across the monorepo",
    children: [
      {
        id: "ai-sdk",
        label: "ai-sdk",
        description: "- Vercel AI SDK wrapper (OpenAI, OpenRouter)",
        icon: <Bot className="h-4 w-4 text-emerald-400" />,
      },
      {
        id: "api",
        label: "api",
        description: "- API definitions and routing",
        icon: <FileCode2 className="h-4 w-4 text-blue-500" />,
      },
      {
        id: "auth",
        label: "identity",
        description: "- Auth abstraction layer (Clerk adapter)",
        icon: <Shield className="h-4 w-4 text-green-500" />,
      },
      {
        id: "db",
        label: "database",
        description: "- Database schema and client setup (Prisma v7)",
        icon: <Database className="h-4 w-4 text-indigo-500" />,
      },
      {
        id: "i18n",
        label: "i18n",
        description: "- Translations and localization setup",
        icon: <Languages className="h-4 w-4 text-teal-500" />,
      },
      {
        id: "logger",
        label: "logs",
        description: "- Structured logging providers (Sentry)",
        icon: <FileText className="h-4 w-4 text-amber-600" />,
      },
      {
        id: "mail",
        label: "email",
        description: "- transactional emails (Resend)",
        icon: <Mail className="h-4 w-4 text-red-500" />,
      },
      {
        id: "payments",
        label: "billing",
        description: "- Payment providers and subscriptions (Stripe)",
        icon: <CreditCard className="h-4 w-4 text-green-600" />,
      },
      {
        id: "storage",
        label: "storage",
        description: "- S3-compatible file storage",
        icon: <Cloud className="h-4 w-4 text-cyan-500" />,
      },
      {
        id: "ui",
        label: "ui",
        description: "- Shared Component library (Radix + framer-motion)",
        icon: <LayoutGrid className="h-4 w-4 text-purple-500" />,
      },
      {
        id: "tokens",
        label: "tokens",
        description: "- Runtime CSS variables single source",
        icon: <Palette className="h-4 w-4 text-orange-400" />,
      },
      {
        id: "brand",
        label: "brand",
        description: "- Brand primitives (colors, gradients)",
        icon: <Sparkles className="h-4 w-4 text-pink-400" />,
      },
      {
        id: "icons",
        label: "icons",
        description: "- Geist icons as TSX components",
        icon: <ImageIcon className="h-4 w-4 text-violet-400" />,
      },
      {
        id: "preset",
        label: "preset",
        description: "- Feature-based SaaS starter config",
        icon: <Settings className="h-4 w-4 text-slate-500" />,
      },
      {
        id: "analytics",
        label: "analytics",
        description: "- PostHog + Dub.co analytics",
        icon: <LineChart className="h-4 w-4 text-rose-500" />,
      },
      {
        id: "audit",
        label: "audit",
        description: "- Audit logging (actor/tenant scoping)",
        icon: <Activity className="h-4 w-4 text-indigo-400" />,
      },
      {
        id: "event-bus",
        label: "event-bus",
        description: "- Inngest background jobs",
        icon: <Workflow className="h-4 w-4 text-fuchsia-500" />,
      },
      {
        id: "cache",
        label: "cache",
        description: "- Redis caching adapter",
        icon: <Zap className="h-4 w-4 text-yellow-500" />,
      },
      {
        id: "rate-limit",
        label: "rate-limit",
        description: "- Token bucket rate limiting",
        icon: <Timer className="h-4 w-4 text-slate-400" />,
      },
      {
        id: "alerting",
        label: "alerting",
        description: "- Email + Slack alert system",
        icon: <Bell className="h-4 w-4 text-red-400" />,
      },
      {
        id: "errors",
        label: "errors",
        description: "- Typed error definitions",
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      },
      {
        id: "health",
        label: "health",
        description: "- Health check probes",
        icon: <HeartPulse className="h-4 w-4 text-rose-400" />,
      },
      {
        id: "contracts",
        label: "contracts",
        description: "- API contract definitions",
        icon: <FileCode2 className="h-4 w-4 text-cyan-600" />,
      },
      {
        id: "config",
        label: "config",
        description: "- Environment variable validation",
        icon: <Settings className="h-4 w-4 text-gray-500" />,
      },
      {
        id: "legal",
        label: "legal",
        description: "- Legal content + GDPR consent",
        icon: <Scale className="h-4 w-4 text-slate-600" />,
      },
      {
        id: "marketing",
        label: "marketing",
        description: "- Marketing components",
        icon: <Megaphone className="h-4 w-4 text-orange-600" />,
      },
      {
        id: "sanity",
        label: "sanity",
        description: "- Sanity CMS queries",
        icon: <MonitorDot className="h-4 w-4 text-red-600" />,
      },
      {
        id: "oauth-server",
        label: "oauth-server",
        description: "- OAuth 2.0 provider",
        icon: <Lock className="h-4 w-4 text-slate-700" />,
      },
      {
        id: "mcp",
        label: "mcp",
        description: "- Model Context Protocol server",
        icon: <ToyBrick className="h-4 w-4 text-yellow-600" />,
      },
    ],
  },
  {
    id: "tooling",
    label: "tooling",
    icon: <FolderOpen className="h-[15px] w-[15px] text-zinc-400 fill-zinc-400/20" />,
    description: "- Development tooling and configuration",
    children: [
      {
        id: "agents",
        label: "AGENTS.md",
        description: "- Guidelines and conventions for AI",
        icon: <FileTerminal className="h-4 w-4 text-green-500" />,
      },
      {
        id: "turbo",
        label: "turbo.json",
        description: "- Pipeline config",
        icon: <FileJson className="h-4 w-4 text-pink-500" />,
      },
    ],
  },
];

function renderNodes(nodes: FileNode[], level = 0, parentPath: boolean[] = []): React.ReactNode {
  return nodes.map((node, index) => {
    const hasChildren = Boolean(node.children?.length);
    const isLast = index === nodes.length - 1;
    return (
      <TreeNode
        key={node.id}
        nodeId={node.id}
        level={level}
        isLast={isLast}
        parentPath={parentPath}
      >
        <TreeNodeTrigger className="hover:bg-muted/80 dark:hover:bg-zinc-800/80 rounded px-1 py-0.5 min-h-[28px] transition-colors group/trigger flex items-center pr-4 min-w-max w-full">
          <TreeExpander
            hasChildren={hasChildren}
            className="text-muted-foreground/30 group-hover/trigger:text-muted-foreground/60 shrink-0 w-[20px]"
          />
          {node.icon && (
            <span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center opacity-90 group-hover/trigger:opacity-100 transition-opacity">
              {node.icon}
            </span>
          )}
          <TreeLabel className="font-mono text-[13px] font-medium text-foreground tracking-tight dark:text-zinc-300 pointer-events-none shrink-0 whitespace-nowrap">
            {node.label}
          </TreeLabel>
          {node.description && (
            <span className="ml-2 hidden sm:inline-block text-[12px] text-muted-foreground/50 font-sans font-normal whitespace-nowrap group-hover/trigger:text-muted-foreground transition-colors pointer-events-none">
              {node.description}
            </span>
          )}
        </TreeNodeTrigger>
        {hasChildren && (
          <TreeNodeContent hasChildren={hasChildren}>
            {renderNodes(node.children!, level + 1, [...parentPath, isLast])}
          </TreeNodeContent>
        )}
      </TreeNode>
    );
  });
}

/**
 * MonorepoFileTree — ML-7.1
 *
 * Interactive Turborepo file tree showing all 8 apps and 29 packages with authentic Lucide icons.
 */
export function MonorepoFileTree({ variant = "default" }: { variant?: "default" | "minimal" }) {
  const t = useTranslations("monorepoTree");

  // Minimal variant used specifically inside HeroMockupWindow.tsx
  if (variant === "minimal") {
    return (
      <div className="flex-1 overflow-hidden flex flex-col w-full h-full relative group/tree">
        {/* Subtle hover gradient indicator for scrollability */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background dark:from-zinc-950 to-transparent z-20 pointer-events-none opacity-80 group-hover/tree:opacity-10 transition-opacity" />

        <div className="p-3 flex-1 overflow-auto w-full relative z-10 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <TreeProvider
            defaultExpandedIds={["apps", "packages", "tooling"]}
            showLines
            showIcons={false} // We provide native icons instead of UI primitive icons
            selectable={false}
            animateExpand
            indent={16}
            className="font-mono text-black/10 dark:text-white/10"
          >
            <TreeView>{renderNodes(TREE_DATA)}</TreeView>
          </TreeProvider>

          <div className="mt-8 mb-4 flex w-full justify-center opacity-0 group-hover/tree:opacity-100 transition-opacity duration-300">
            <p className="text-[11px] text-muted-foreground/60 font-sans px-4 py-1.5 rounded-full border border-border/50 bg-background/50 shadow-sm cursor-default">
              Hover or scroll to explore project structure
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <article className="group relative flex h-full flex-col rounded-[2.5rem] border border-border/40 bg-background/60 dark:bg-zinc-950/60 p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-2xl overflow-hidden backdrop-blur-2xl transition-all hover:border-primary/40">
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Subtle grid bg */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <AnimateIn preset="emerge" inView>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("badge")}
            </p>
          </div>
          <p className="text-2xl font-black text-foreground tracking-tight mb-2">{t("title")}</p>
          <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed">
            {t("description")}
          </p>
        </AnimateIn>

        <div className="flex-1 overflow-hidden flex flex-col rounded-2xl border border-border/50 bg-background/40 dark:bg-[#0a0a0a]/80 shadow-inner backdrop-blur-sm relative">
          <div className="flex flex-none items-center px-4 h-[42px] border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20">
            <div className="flex gap-1.5 items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] shadow-sm"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] shadow-sm"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] shadow-sm"></div>
            </div>
            <div className="flex-1 flex justify-center pb-0.5 pr-[48px]">
              <span className="text-[12px] font-sans font-medium text-zinc-500 dark:text-zinc-400">
                nebutra-sailor / Project Explorer
              </span>
            </div>
          </div>

          {/* Subtle hover gradient indicator for scrollability */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background dark:from-zinc-950 to-transparent z-20 pointer-events-none opacity-80" />

          <div className="p-4 sm:p-5 flex-1 overflow-auto w-full relative z-10 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent">
            <TreeProvider
              defaultExpandedIds={["apps", "packages", "tooling"]}
              showLines
              showIcons={false}
              selectable={false}
              animateExpand
              indent={16}
              className="font-mono text-black/20 dark:text-white/20"
            >
              <TreeView>{renderNodes(TREE_DATA)}</TreeView>
            </TreeProvider>
          </div>
        </div>

        <Link
          href="/docs/monorepo"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group/link"
        >
          {t("cta")}
          <span className="text-primary transition-transform group-hover/link:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

MonorepoFileTree.displayName = "MonorepoFileTree";
