"use client";

import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimateIn } from "./AnimateIn";

interface FileNode {
  id: string;
  label: string;
  description?: string;
  tag?: string;
  children?: FileNode[];
}

const TREE_DATA: FileNode[] = [
  {
    id: "apps",
    label: "apps/",
    children: [
      { id: "landing", label: "landing-page/", description: "Next.js 15", tag: "Marketing" },
      { id: "web", label: "web/", description: "Next.js 15", tag: "Dashboard" },
      { id: "api", label: "api-gateway/", description: "Hono + OpenAPI", tag: "Backend" },
      { id: "studio", label: "studio/", description: "Sanity v4", tag: "CMS" },
      { id: "docs", label: "design-docs/", description: "Fumadocs", tag: "Internal Docs" },
      {
        id: "storybook",
        label: "storybook/",
        description: "Storybook 8",
        tag: "Component Library",
      },
    ],
  },
  {
    id: "packages",
    label: "packages/",
    children: [
      { id: "ui", label: "ui/", description: "Radix + Framer", tag: "Primitives" },
      { id: "tokens", label: "tokens/", description: "Tailwind v4", tag: "Design System" },
      { id: "icons", label: "icons/", description: "541 Geist icons", tag: "TSX" },
      { id: "brand", label: "brand/", description: "Colors + Motion", tag: "VI" },
      { id: "theme", label: "i18n/", description: "next-intl", tag: "Localization" },
    ],
  },
  {
    id: "config",
    label: "turbo.json",
    description: "Turborepo pipeline config",
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
        <TreeNodeTrigger className="hover:bg-muted/60 dark:hover:bg-zinc-800/50 rounded-md px-1.5 py-1 transition-colors group/trigger">
          <TreeExpander
            hasChildren={hasChildren}
            className="text-muted-foreground/40 group-hover/trigger:text-muted-foreground"
          />
          <TreeIcon
            hasChildren={hasChildren}
            className="text-primary/60 group-hover/trigger:text-primary transition-colors"
          />
          <TreeLabel className="font-mono text-sm font-medium text-foreground group-hover/trigger:text-primary transition-colors ml-1.5">
            {node.label}
          </TreeLabel>
          {node.description && (
            <span className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden text-xs text-muted-foreground/60 font-medium tracking-tight sm:inline">
                {node.description}
              </span>
              {node.tag && (
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-lg border border-primary/20 bg-primary/5 text-primary/90 font-mono font-semibold tracking-tight uppercase shadow-sm">
                  {node.tag}
                </span>
              )}
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
 * Interactive Turborepo file tree showing all 6 apps and 5 packages.
 */
export function MonorepoFileTree() {
  const t = useTranslations("monorepoTree");
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

        <div className="flex-1 overflow-hidden rounded-2xl border border-border/50 bg-background/40 dark:bg-[#0a0a0a]/80 shadow-inner flex flex-col backdrop-blur-sm">
          {/* Faux Terminal Header */}
          <div className="flex flex-none items-center px-4 h-11 border-b border-border/60 bg-muted/50 dark:bg-zinc-950/80 backdrop-blur-md z-20">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
            </div>
            <div className="ml-4 flex-1 text-center pr-10">
              <span className="text-[11px] font-mono font-medium text-muted-foreground/80 dark:text-zinc-500 tracking-wider">
                nebutra-sailor / tree
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto w-full relative z-10">
            <TreeProvider
              defaultExpandedIds={["apps", "packages"]}
              showLines
              showIcons
              selectable={false}
              animateExpand
              indent={20}
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
