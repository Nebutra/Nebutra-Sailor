"use client";

import type { ForgeToolSummary } from "@nebutra/forge-runtime";
import { MagnifyingGlass } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useMemo, useState } from "react";

export function HomeSearch({ tools }: { tools: readonly ForgeToolSummary[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return tools
      .filter((t) => {
        const hay =
          `${t.title.zh} ${t.title.en} ${t.slug} ${t.category} ${t.description.zh}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 10);
  }, [q, tools]);

  return (
    <div className="relative mx-auto max-w-xl text-left">
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="forge-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：字数、base64、json、时间戳…"
          className="h-12 pl-10 shadow-sm"
          autoComplete="off"
          aria-label="搜索工具"
        />
      </div>
      {filtered.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-[var(--radius-lg)] border border-border bg-background py-2 shadow-lg">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={t.path}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-accent"
              >
                <span>
                  <span className="font-medium text-foreground">{t.title.zh}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.description.zh}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {t.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : q.trim() ? (
        <div
          className="absolute z-20 mt-2 flex w-full flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-background px-4 py-6 text-center shadow-lg"
          role="status"
        >
          {/* biome-ignore lint/performance/noImgElement: transparent product empty glyph */}
          <img
            src="/product/forge-empty.png"
            alt=""
            width={64}
            height={64}
            draggable={false}
            className="h-14 w-14 object-contain opacity-80"
          />
          <p className="text-sm text-muted-foreground">没有匹配「{q.trim()}」的工具</p>
          <p className="text-xs text-muted-foreground">试试别的关键词，或从分类里挑一把锤子。</p>
        </div>
      ) : null}
    </div>
  );
}
