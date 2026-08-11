"use client";

import { ArrowRight } from "@nebutra/icons";
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
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { getPackageFeatureHref } from "@/components/landing/features/package-feature-data";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { AnimateIn } from "./AnimateIn";

const TREE_METRICS = [
  { labelKey: "metricApps", value: "10" },
  { labelKey: "metricBackends", value: "4" },
  { labelKey: "metricPackages", value: "102" },
] as const;

const EMPTY_PARENT_PATH: boolean[] = [];

function TreeNodes({
  level = 0,
  nodes,
  parentPath = EMPTY_PARENT_PATH,
}: {
  level?: number;
  nodes: FileNode[];
  parentPath?: boolean[];
}): ReactNode {
  const locale = useLocale();

  return nodes.map((node, index) => {
    const hasChildren = Boolean(node.children?.length);
    const isLast = index === nodes.length - 1;
    const isTopLevel = level === 0;
    const featureHref = getPackageFeatureHref(locale, node);
    const icon = (
      <span
        aria-hidden="true"
        className="mr-2 flex size-4 shrink-0 items-center justify-center opacity-90 transition-opacity group-hover/trigger:opacity-100"
      >
        {node.icon}
      </span>
    );

    return (
      <TreeNode
        key={node.id}
        nodeId={node.id}
        level={level}
        isLast={isLast}
        parentPath={parentPath}
      >
        <TreeNodeTrigger
          className={`group/trigger flex min-h-8 min-w-max w-full items-center rounded-[var(--radius-md)] py-1 pr-4 transition-colors hover:bg-muted dark:hover:bg-muted ${
            isTopLevel ? "px-1 font-semibold" : "px-1"
          }`}
          title={node.path}
        >
          <TreeExpander
            hasChildren={hasChildren}
            className="w-5 shrink-0 text-muted-foreground/35 group-hover/trigger:text-muted-foreground/70"
          />
          {node.icon && featureHref ? (
            <Link
              aria-label={`${node.label} feature page`}
              className="rounded-[var(--radius-sm)]"
              href={featureHref}
              onClick={(event) => event.stopPropagation()}
            >
              {icon}
            </Link>
          ) : (
            node.icon && icon
          )}
          <TreeLabel
            translate="no"
            className={`pointer-events-none shrink-0 whitespace-nowrap font-mono font-medium tracking-normal ${
              isTopLevel ? "text-[13.5px] text-foreground" : "text-[13px] text-foreground/90"
            }`}
          >
            {node.label}
          </TreeLabel>
          {node.tag && (
            <span className="ml-2 rounded-full border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/80">
              {node.tag}
            </span>
          )}
          {node.description && (
            <span className="ml-2 hidden max-w-[440px] truncate font-sans font-normal text-[12px] text-muted-foreground/55 transition-colors group-hover/trigger:text-muted-foreground sm:inline-block">
              {node.description}
            </span>
          )}
          {featureHref && (
            <Link
              aria-label={`${node.label} feature detail`}
              className="ml-2 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground opacity-0 transition-[opacity,color,border-color] group-hover/trigger:opacity-100 hover:border-primary/50 hover:text-primary focus-visible:opacity-100"
              href={featureHref}
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </TreeNodeTrigger>
        {hasChildren && (
          <TreeNodeContent hasChildren={hasChildren}>
            <TreeNodes
              nodes={node.children ?? []}
              level={level + 1}
              parentPath={[...parentPath, isLast]}
            />
          </TreeNodeContent>
        )}
      </TreeNode>
    );
  });
}

function BaseTree({ variant = "default" }: { variant: "default" | "minimal" }) {
  return (
    <div
      className={`relative z-10 w-full flex-1 overflow-auto overscroll-contain scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent hover:scrollbar-thumb-primary/20 ${variant === "minimal" ? "p-3" : "p-4 sm:p-5"}`}
    >
      <TreeProvider
        defaultExpandedIds={["apps", "backends", "packages", "tooling"]}
        showLines
        showIcons={false}
        selectable={false}
        animateExpand
        indent={16}
        className={`font-mono ${variant === "minimal" ? "text-black/10" : "text-black/20"}`}
      >
        <TreeView>
          <TreeNodes nodes={TREE_DATA} />
        </TreeView>
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-background to-transparent opacity-80 transition-opacity group-hover/tree:opacity-10" />

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
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-[var(--color-glass-panel,rgba(255,255,255,0.72))] p-6 transition-[border-color,box-shadow,background-color] duration-300 hover:border-primary/40 dark:bg-[var(--color-glass-panel,rgba(24,24,27,0.72))] md:p-8"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,120,120,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,120,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />

      <div className="relative z-10 flex flex-col h-full">
        <AnimateIn preset="emerge" inView>
          <div className="mb-4 flex items-center gap-3">
            <div className="size-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("badge")}
            </p>
          </div>
          <p
            className="text-2xl font-semibold text-foreground mb-2"
            style={{ letterSpacing: "var(--tracking-heading)" }}
          >
            {t("title")}
          </p>
          <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed">
            {t("description")}
          </p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {TREE_METRICS.map((metric) => (
              <div
                key={metric.labelKey}
                className="rounded-[var(--radius-sm)] border border-border bg-background/65 px-3 py-2 shadow-sm dark:bg-muted/70"
              >
                <p className="font-mono text-lg font-semibold leading-none text-foreground tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                  {t(metric.labelKey)}
                </p>
              </div>
            ))}
          </div>
        </AnimateIn>

        <div className="relative flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-background/55 shadow-inner dark:bg-muted/80">
          <div className="z-20 flex h-[42px] flex-none items-center border-black/5 border-b bg-white/55 px-4">
            <div className="flex gap-1.5 items-center">
              <div className="size-2.5 rounded-full bg-[#ff5f56] shadow-sm" />
              <div className="size-2.5 rounded-full bg-[#ffbd2e] shadow-sm" />
              <div className="size-2.5 rounded-full bg-[#27c93f] shadow-sm" />
            </div>
            <div className="flex min-w-0 flex-1 justify-center pb-0.5 pr-[48px]">
              <span
                className="truncate font-sans font-medium text-[12px] text-muted-foreground"
                translate="no"
              >
                nebutra-sailor / Project Explorer / packages
              </span>
            </div>
          </div>
          <div className="z-10 flex flex-none items-center gap-2 border-border border-b bg-background/70 px-4 py-2 text-[11px] text-muted-foreground">
            <span
              className="rounded-full border border-border bg-muted px-2 py-1 font-mono text-foreground/80"
              translate="no"
            >
              main
            </span>
            <span className="hidden truncate sm:inline">{t("verifiedPaths")}</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-background to-transparent opacity-85" />

          <BaseTree variant="default" />
        </div>

        <Link
          href={createPublicDocsUrl("development/project-structure")}
          className="group/link mt-6 inline-flex w-fit items-center gap-2 rounded-full p-1 font-semibold text-muted-foreground text-sm transition-colors hover:text-primary"
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
