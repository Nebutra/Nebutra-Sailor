"use client";

import { Clock, Lightning, MagnifyingGlass as Search } from "@nebutra/icons";
import { Badge, Input, Kbd, Progress } from "@nebutra/ui/primitives";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type ResultRow = {
  id: string;
  path: string;
  score: number;
};

const RESULTS: ReadonlyArray<ResultRow> = [
  { id: "r1", path: "posts/2024/billing-v2.md", score: 0.94 },
  { id: "r2", path: "docs/billing/migration.mdx", score: 0.89 },
  { id: "r3", path: "changelog/2026/adapters.md", score: 0.81 },
  { id: "r4", path: "docs/patterns/migration.mdx", score: 0.76 },
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
          <mark key={i} className="rounded-[2px] bg-blue-3 px-0.5 text-primary">
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

type SearchCopy = {
  results: Record<string, { title: string; excerpt: string }>;
  placeholder: string;
  indexLabel: string;
  tagsLabel: string;
  /** Already interpolated with STATS server-side, in getShowcaseCopy(). */
  footer: string;
  relevance: string;
};

const STATS = { count: "12,401", ms: "38ms" };

export function SearchShowcase({ copy: rawCopy }: PackageShowcaseProps) {
  const copy = rawCopy as SearchCopy;

  return (
    <ShowcaseFrame>
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
            {RESULTS.map((r, index) => (
              <li
                key={r.id}
                className="rounded-[var(--radius-md)] border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-foreground">
                    <HighlightedText text={copy.results[String(index)].title} />
                  </p>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.score.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  <HighlightedText text={copy.results[String(index)].excerpt} />
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
            <span className="tabular-nums">{copy.footer}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {STATS.ms}
          </span>
        </div>
      </div>
    </ShowcaseFrame>
  );
}
