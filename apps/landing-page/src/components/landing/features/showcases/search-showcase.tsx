"use client";

import { Clock, Lightning, MagnifyingGlass as Search } from "@nebutra/icons";
import { Badge, Input, Kbd, Progress } from "@nebutra/ui/primitives";
import type { PackageShowcaseProps } from "./types";

type Locale = "en" | "zh";

type ResultRow = {
  id: string;
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
  path: string;
  score: number;
};

const RESULTS: ReadonlyArray<ResultRow> = [
  {
    id: "r1",
    title: { en: "Billing v2 migration playbook", zh: "Billing v2 迁移手册" },
    excerpt: {
      en: "Step-by-step migration from legacy invoices to the new metering pipeline.",
      zh: "从旧版发票迁移到新计量管道的逐步流程。",
    },
    path: "posts/2024/billing-v2.md",
    score: 0.94,
  },
  {
    id: "r2",
    title: { en: "Migration checklist for billing tenants", zh: "针对 billing 租户的迁移清单" },
    excerpt: {
      en: "Verify RLS, secrets rotation, and webhook backfill before cutover.",
      zh: "切换前请确认 RLS、密钥轮换和 webhook 回填。",
    },
    path: "docs/billing/migration.mdx",
    score: 0.89,
  },
  {
    id: "r3",
    title: { en: "Stripe → Polar billing adapter notes", zh: "Stripe → Polar billing 适配器笔记" },
    excerpt: {
      en: "Provider-agnostic shape keeps customer code stable across switches.",
      zh: "Provider-agnostic 形态让客户代码在切换时保持稳定。",
    },
    path: "changelog/2026/adapters.md",
    score: 0.81,
  },
  {
    id: "r4",
    title: { en: "Zero-downtime migration patterns", zh: "零停机 migration 模式" },
    excerpt: {
      en: "Dual-write, shadow-read, then flip — applies to billing data too.",
      zh: "双写、影子读取、最后切换——同样适用于 billing 数据。",
    },
    path: "docs/patterns/migration.mdx",
    score: 0.76,
  },
];

const TOKEN_RX = /(billing|migration)/gi;
const TOKEN_SET = new Set(["billing", "migration"]);

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(TOKEN_RX);
  return (
    <>
      {parts.map((part, i) =>
        TOKEN_SET.has(part.toLowerCase()) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional in split output
          <mark key={i} className="rounded-[2px] bg-[var(--blue-3)] px-0.5 text-[var(--blue-11)]">
            {part}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional in split output
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const INDEXES: ReadonlyArray<{ label: string; count: number; active?: boolean }> = [
  { label: "posts", count: 12, active: true },
  { label: "docs", count: 47 },
  { label: "changelog", count: 3 },
];

const TAGS = [
  { label: "billing", count: 8 },
  { label: "migration", count: 4 },
] as const;

const COPY = {
  en: {
    placeholder: "Search docs, posts, changelog…",
    indexLabel: "Index",
    tagsLabel: "Tags",
    footer: (n: string, ms: string) => `Searched ${n} docs in ${ms} · Meilisearch backend`,
    relevance: "score",
  },
  zh: {
    placeholder: "搜索文档、帖子、更新日志……",
    indexLabel: "索引",
    tagsLabel: "标签",
    footer: (n: string, ms: string) => `检索 ${n} 篇文档 用时 ${ms} · Meilisearch 后端`,
    relevance: "得分",
  },
} as const;

const STATS = { count: "12,401", ms: "38ms" };

export function SearchShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <div className="space-y-4">
        <Input
          id="search-showcase-input"
          readOnly
          value="billing migration"
          placeholder={copy.placeholder}
          prefix={<Search aria-hidden="true" />}
          suffix={
            <Kbd small meta>
              K
            </Kbd>
          }
          aria-label={copy.placeholder}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <ul className="space-y-2 md:col-span-2">
            {RESULTS.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-foreground">
                    <HighlightedText text={r.title[locale]} />
                  </p>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.score.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  <HighlightedText text={r.excerpt[locale]} />
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                    {r.path}
                  </Badge>
                  <Progress
                    value={Math.round(r.score * 100)}
                    max={100}
                    size="sm"
                    className="h-1 flex-1"
                    aria-label={`${copy.relevance} ${r.score.toFixed(2)}`}
                  />
                </div>
              </li>
            ))}
          </ul>

          <aside className="space-y-4">
            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.indexLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INDEXES.map((f) => (
                  <Badge
                    key={f.label}
                    variant={f.active ? "blue-subtle" : "outline"}
                    size="sm"
                    className="font-mono text-[10px]"
                  >
                    {f.label} <span className="ml-1 opacity-70">{f.count}</span>
                  </Badge>
                ))}
              </div>
            </section>
            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.tagsLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => (
                  <Badge
                    key={t.label}
                    variant="gray-subtle"
                    size="sm"
                    className="font-mono text-[10px]"
                  >
                    #{t.label} <span className="ml-1 opacity-70">{t.count}</span>
                  </Badge>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lightning className="h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">{copy.footer(STATS.count, STATS.ms)}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {STATS.ms}
          </span>
        </div>
      </div>
    </div>
  );
}
