"use client";

import { ArrowUpRight, MagnifyingGlass } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { Badge, Button, Input } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { VcOrg } from "@/lib/constants/vc";
import { VcLogo } from "./VcLogo";

const PAGE = 60;
const SECTOR_PREVIEW = 14;

type Variant = "deals" | "global";
type Sort = "total" | "founded" | "name";

interface Copy {
  searchPlaceholder: string;
  sectors: string;
  types: string;
  more: string;
  less: string;
  sortLabel: string;
  sortTotal: string;
  sortFounded: string;
  sortName: string;
  results: (n: number) => string;
  loadMore: string;
  clear: string;
  visitSite: string;
  noResults: string;
  totalDeals: string;
  founded: string;
}

const COPY: Record<"en" | "zh", Copy> = {
  zh: {
    searchPlaceholder: "搜索机构名称或简介…",
    sectors: "赛道",
    types: "类型",
    more: "更多",
    less: "收起",
    sortLabel: "排序",
    sortTotal: "总投资数",
    sortFounded: "成立年份",
    sortName: "名称",
    results: (n) => `${n} 家机构`,
    loadMore: "加载更多",
    clear: "清除筛选",
    visitSite: "访问官网",
    noResults: "没有匹配的机构,试试调整筛选条件。",
    totalDeals: "总投资",
    founded: "成立",
  },
  en: {
    searchPlaceholder: "Search institutions or descriptions…",
    sectors: "Sectors",
    types: "Types",
    more: "more",
    less: "less",
    sortLabel: "Sort",
    sortTotal: "Total deals",
    sortFounded: "Founded",
    sortName: "Name",
    results: (n) => `${n} institutions`,
    loadMore: "Load more",
    clear: "Clear filters",
    visitSite: "Website",
    noResults: "No matching institutions — try adjusting the filters.",
    totalDeals: "Total",
    founded: "Founded",
  },
};

export interface VcDirectoryProps {
  orgs: VcOrg[];
  sectors: string[];
  types: string[];
  locale: "en" | "zh";
  variant: Variant;
  /** Base path for per-institution profile links, e.g. "/solutions/china-vc". */
  hrefBase: string;
}

type LocalizedHref = Parameters<typeof Link>[0]["href"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-[color:var(--neutral-12)] text-[color:var(--neutral-1)]"
          : "border-border/60 text-neutral-11 hover:border-foreground/40 hover:text-neutral-12",
      )}
    >
      {children}
    </button>
  );
}

function VcCard({
  org,
  c,
  variant,
  logoSrc,
  hrefBase,
}: {
  org: VcOrg;
  c: Copy;
  variant: Variant;
  logoSrc: string | null;
  hrefBase: string;
}) {
  return (
    <div className="group relative flex h-full flex-col rounded-[var(--radius-2xl)] border border-border/60 p-5 transition-colors hover:border-foreground/30">
      <div className="flex items-start gap-3">
        <VcLogo src={logoSrc} name={org.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-neutral-12" title={org.name}>
            <Link
              href={`${hrefBase}/${org.id}` as LocalizedHref}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {org.name}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {org.types.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="px-1.5 py-0 text-[0.65rem]">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {org.summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-11">{org.summary}</p>
      ) : null}

      {org.sectors.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {org.sectors.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded bg-muted/60 px-1.5 py-0.5 text-[0.65rem] text-neutral-11"
            >
              {s}
            </span>
          ))}
          {org.sectors.length > 4 ? (
            <span className="px-1 py-0.5 text-[0.65rem] text-muted-foreground/70">
              +{org.sectors.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex gap-4 text-xs text-neutral-11">
          {variant === "deals" ? (
            <span>
              {c.totalDeals} <strong className="text-neutral-12">{org.total ?? 0}</strong>
            </span>
          ) : (
            <>
              {org.region ? <span>{org.region}</span> : null}
              {org.founded ? (
                <span>
                  {c.founded} {org.founded}
                </span>
              ) : null}
            </>
          )}
        </div>
        {org.website ? (
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer nofollow"
            className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-neutral-11 transition-colors hover:text-neutral-12"
          >
            {c.visitSite}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function VcDirectory({ orgs, sectors, types, locale, variant, hrefBase }: VcDirectoryProps) {
  const c = COPY[locale];
  const [query, setQuery] = useState("");
  const [activeSectors, setActiveSectors] = useState<Set<string>>(new Set());
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>(variant === "deals" ? "total" : "name");
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
    setVisible(PAGE);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = orgs.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q) && !o.summary.toLowerCase().includes(q))
        return false;
      if (activeSectors.size && !o.sectors.some((s) => activeSectors.has(s))) return false;
      if (activeTypes.size && !o.types.some((t) => activeTypes.has(t))) return false;
      return true;
    });
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "zh"));
    else if (sort === "founded") list.sort((a, b) => (b.founded ?? 0) - (a.founded ?? 0));
    else list.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    return list;
  }, [orgs, query, activeSectors, activeTypes, sort]);

  const hasFilters = Boolean(query || activeSectors.size || activeTypes.size);
  const shownSectors = showAllSectors ? sectors : sectors.slice(0, SECTOR_PREVIEW);

  const sortOptions: [Sort, string][] =
    variant === "deals"
      ? [
          ["total", c.sortTotal],
          ["name", c.sortName],
        ]
      : [
          ["name", c.sortName],
          ["founded", c.sortFounded],
        ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6">
      <div className="relative mb-5 max-w-xl">
        <MagnifyingGlass className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground/60" />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE);
          }}
          placeholder={c.searchPlaceholder}
          className="pl-9"
          aria-label={c.searchPlaceholder}
        />
      </div>

      <div className="mb-3">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          {c.sectors}
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {shownSectors.map((s) => (
            <Chip
              key={s}
              active={activeSectors.has(s)}
              onClick={() => toggle(activeSectors, setActiveSectors, s)}
            >
              {s}
            </Chip>
          ))}
          {sectors.length > SECTOR_PREVIEW ? (
            <button
              type="button"
              onClick={() => setShowAllSectors((v) => !v)}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground/80 underline-offset-2 hover:underline"
            >
              {showAllSectors ? c.less : `+${sectors.length - SECTOR_PREVIEW} ${c.more}`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          {c.types}
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {types.map((t) => (
            <Chip
              key={t}
              active={activeTypes.has(t)}
              onClick={() => toggle(activeTypes, setActiveTypes, t)}
            >
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 border-y border-border/40 py-3">
        <span className="text-sm font-medium text-neutral-12">{c.results(filtered.length)}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground/70">{c.sortLabel}</span>
          {sortOptions.map(([key, label]) => (
            <Chip key={key} active={sort === key} onClick={() => setSort(key)}>
              {label}
            </Chip>
          ))}
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveSectors(new Set());
              setActiveTypes(new Set());
              setVisible(PAGE);
            }}
            className="text-xs font-medium text-muted-foreground/80 underline-offset-2 hover:underline"
          >
            {c.clear}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={<MagnifyingGlass className="h-6 w-6" />}
          title={c.noResults}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, visible).map((org) => (
              <VcCard
                key={org.id}
                org={org}
                c={c}
                variant={variant}
                logoSrc={org.logo ?? null}
                hrefBase={hrefBase}
              />
            ))}
          </div>
          {visible < filtered.length ? (
            <div className="mt-10 flex justify-center">
              <Button type="button" variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
                {c.loadMore} ({filtered.length - visible})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
