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
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { AnimateIn } from "./AnimateIn";

function renderNodes(nodes: FileNode[], level = 0, parentPath: boolean[] = []): ReactNode {
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
            {renderNodes(node.children ?? [], level + 1, [...parentPath, isLast])}
          </TreeNodeContent>
        )}
      </TreeNode>
    );
  });
}

function BaseTree({ variant = "default" }: { variant: "default" | "minimal" }) {
  return (
    <div
      className={`p-4 sm:p-5 flex-1 overflow-auto w-full relative z-10 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent ${variant === "minimal" ? "p-3" : ""}`}
    >
      <TreeProvider
        defaultExpandedIds={["apps", "packages", "tooling"]}
        showLines
        showIcons={false}
        selectable={false}
        animateExpand
        indent={16}
        className={`font-mono ${variant === "minimal" ? "text-black/10 dark:text-white/10" : "text-black/20 dark:text-white/20"}`}
      >
        <TreeView>{renderNodes(TREE_DATA)}</TreeView>
      </TreeProvider>
    </div>
  );
}

/**
 * MinimalMonorepoTree - Used specifically inside HeroMockupWindow.tsx
 */
export function MinimalMonorepoTree() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col w-full h-full relative group/tree">
      {/* Subtle hover gradient indicator for scrollability */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background dark:from-zinc-950 to-transparent z-20 pointer-events-none opacity-80 group-hover/tree:opacity-10 transition-opacity" />

      <BaseTree variant="minimal" />

      <div className="mt-8 mb-4 flex w-full justify-center opacity-0 group-hover/tree:opacity-100 transition-opacity duration-300">
        <p className="text-[11px] text-muted-foreground/60 font-sans px-4 py-1.5 rounded-full border border-border/50 bg-background/50 shadow-sm cursor-default">
          Hover or scroll to explore project structure
        </p>
      </div>
    </div>
  );
}

/**
 * MonorepoFileTree
 * Interactive Turborepo file tree showing all apps and packages with authentic Lucide icons.
 */
export function MonorepoFileTree() {
  const t = useTranslations("monorepoTree");

  return (
    <article className="group relative flex h-full flex-col rounded-[2.5rem] border border-border/40 bg-[var(--color-glass-panel,rgba(255,255,255,0.6))] dark:bg-[var(--color-glass-panel,rgba(24,24,27,0.6))] p-8 md:p-10 shadow-elevation-high dark:shadow-2xl overflow-hidden backdrop-blur-2xl transition-all hover:border-primary/40">
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

          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background dark:from-zinc-950 to-transparent z-20 pointer-events-none opacity-80" />

          <BaseTree variant="default" />
        </div>

        <Link
          href={createPublicDocsUrl("development/project-structure")}
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
