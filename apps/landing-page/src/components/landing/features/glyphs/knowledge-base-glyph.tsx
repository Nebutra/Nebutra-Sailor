"use client";

import { BookClosed, Clock, MagnifyingGlass } from "@nebutra/icons";
import { Badge, Input } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ArticleRow = {
  title: string;
  category: string;
  readTime: string;
  views: string;
};

const ARTICLES: readonly ArticleRow[] = [
  {
    title: "Reset your API key",
    category: "Security",
    readTime: "5min read",
    views: "1,247 views",
  },
  {
    title: "How webhooks deliver",
    category: "Integrations",
    readTime: "3min read",
    views: "847 views",
  },
  {
    title: "Billing FAQ",
    category: "Billing",
    readTime: "8min read",
    views: "412 views",
  },
] as const;

export function KnowledgeBaseGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="flex w-full flex-col gap-1.5 overflow-hidden p-3"
      aria-hidden="true"
    >
      <div className="pointer-events-none">
        <Input
          size="sm"
          readOnly
          tabIndex={-1}
          aria-label="Knowledge base search preview"
          placeholder="search docs..."
          prefix={<MagnifyingGlass />}
        />
      </div>

      <ul className="m-0 flex flex-col gap-1 p-0">
        {ARTICLES.map((article) => (
          <li
            key={article.title}
            className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1"
          >
            <BookClosed className="size-3 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] leading-tight text-foreground">
                  {article.title}
                </span>
                <Badge variant="outline" size="sm" className="shrink-0 text-[9px]">
                  {article.category}
                </Badge>
              </div>
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                <Clock className="size-2.5" />
                {article.readTime} · {article.views}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto font-mono text-[10px] text-muted-foreground">
        47 articles · 4 categories · 92% solve rate
      </div>
    </div>
  );
}
