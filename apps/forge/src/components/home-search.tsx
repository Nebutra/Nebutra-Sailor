"use client";

import type { ForgeToolSummary } from "@nebutra/forge-runtime";
import { isChineseLocale } from "@nebutra/i18n/locales";
import { MagnifyingGlass } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function pickBilingual(locale: string, fields: { zh: string; en: string }): string {
  return isChineseLocale(locale) ? fields.zh : fields.en;
}

export function HomeSearch({ tools }: { tools: readonly ForgeToolSummary[] }) {
  const [q, setQ] = useState("");
  const t = useTranslations("search");
  const tCat = useTranslations("categories");
  const locale = useLocale();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return tools
      .filter((tool) => {
        const hay =
          `${tool.title.zh} ${tool.title.en} ${tool.slug} ${tool.category} ${tool.description.zh} ${tool.description.en}`.toLowerCase();
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
          placeholder={t("placeholder")}
          className="h-12 pl-10 shadow-sm"
          autoComplete="off"
          aria-label={t("aria")}
        />
      </div>
      {filtered.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-[var(--radius-lg)] border border-border bg-background py-2 shadow-lg">
          {filtered.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.path}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-accent"
              >
                <span>
                  <span className="font-medium text-foreground">
                    {pickBilingual(locale, tool.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {pickBilingual(locale, tool.description)}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {tCat.has(`${tool.category}.label` as never)
                    ? tCat(`${tool.category}.label` as never)
                    : tool.category}
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
          <img
            src="/product/forge-empty.png"
            alt=""
            width={64}
            height={64}
            draggable={false}
            className="h-14 w-14 object-contain opacity-80"
          />
          <p className="text-sm text-muted-foreground">{t("emptyTitle", { query: q.trim() })}</p>
          <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
