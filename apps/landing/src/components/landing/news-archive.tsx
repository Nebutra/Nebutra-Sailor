"use client";

import { ArrowRight, MagnifyingGlass as Search } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NewsRailCarousel, type NewsRailSlide } from "./news-rail-carousel";

export type NewsArchiveItem = {
  id: string;
  title: string;
  href: string;
  category: string | null;
  dateLabel: string | null;
  searchText?: string;
};

const PAGE_SIZE = 10;

export function NewsArchive({
  items,
  railSlides,
  isZh,
}: {
  items: NewsArchiveItem[];
  railSlides: NewsRailSlide[];
  isZh: boolean;
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.category ?? "", item.searchText ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > shown.length;

  const copy = {
    heading: isZh ? "新闻" : "News",
    search: isZh ? "搜索新闻" : "Search",
    date: isZh ? "日期" : "Date",
    category: isZh ? "分类" : "Category",
    title: isZh ? "标题" : "Title",
    more: isZh ? "查看更多" : "See more",
    empty: isZh ? "没有匹配的新闻" : "No matching news",
    emptyBody: isZh ? "换一个关键词试试。" : "Try another keyword.",
  };

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {copy.heading}
        </h2>
        <label htmlFor="news-search" className="relative block sm:w-80">
          <span className="sr-only">{copy.search}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="news-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-11 w-full pl-9"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="min-w-0">
          {shown.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-background px-6 py-12 text-center">
              <p className="text-base font-semibold text-foreground">{copy.empty}</p>
              <p className="mt-2 text-sm text-muted-foreground">{copy.emptyBody}</p>
            </div>
          ) : (
            <>
              <div
                aria-hidden
                className="hidden grid-cols-[7.5rem_minmax(7rem,10rem)_minmax(0,1fr)] gap-6 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:grid"
              >
                <span>{copy.date}</span>
                <span>{copy.category}</span>
                <span>{copy.title}</span>
              </div>

              <ul className="flex flex-col">
                {shown.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group grid gap-x-6 gap-y-1 border-b border-border py-5 [transition-duration:var(--motion-duration-flow)] [transition-property:background-color] [transition-timing-function:var(--ease-out)] hover:bg-muted motion-reduce:transition-none sm:grid-cols-[7.5rem_minmax(7rem,10rem)_minmax(0,1fr)] sm:items-baseline"
                    >
                      <span className="text-sm text-muted-foreground">{item.dateLabel ?? "—"}</span>
                      <span className="text-sm text-muted-foreground">{item.category ?? "—"}</span>
                      <span className="text-base font-medium leading-snug text-foreground [transition-duration:var(--motion-duration-flow)] [transition-property:color] [transition-timing-function:var(--ease-out)] group-hover:text-[hsl(var(--primary))] motion-reduce:transition-none">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisible((value) => value + PAGE_SIZE)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-5 py-3.5 text-sm font-medium text-muted-foreground [transition-duration:var(--motion-duration-flow)] [transition-property:background-color,color] [transition-timing-function:var(--ease-out)] hover:bg-muted hover:text-foreground motion-reduce:transition-none"
                >
                  {copy.more}
                  <ArrowRight className="size-4 rotate-90" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <NewsRailCarousel slides={railSlides} isZh={isZh} />
        </aside>
      </div>
    </section>
  );
}
