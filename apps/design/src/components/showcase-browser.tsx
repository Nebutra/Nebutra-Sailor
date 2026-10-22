"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { FilterPills, Input, Toaster } from "@nebutra/ui/primitives";
import { Fragment, useEffect, useMemo, useState } from "react";
import { type BlockEntry, ShowcaseBlock } from "@/components/showcase-block";
import { ShowcaseCard } from "@/components/showcase-card";
import { GraduationRules } from "@/components/showcase-graduation";
import type { ShowcaseItem } from "@/lib/showcase";
import {
  type CardItem,
  filterItems,
  type ShowcaseStatus,
  type ShowcaseTier,
  TIERS,
} from "@/lib/showcase-model";

type Tier = ShowcaseTier | "all";
type Status = ShowcaseStatus | "all";

const STATUSES: { value: Status; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "stable", label: "Stable" },
  { value: "experimental", label: "Experimental" },
  { value: "lab", label: "Lab" },
];

const GRID = "grid grid-flow-dense grid-cols-1 gap-4 @min-[576px]/grid:grid-cols-6";

function readParams(): { tier: Tier; status: Status; query: string } {
  const params = new URLSearchParams(window.location.search);
  const tier = params.get("tier") as Tier | null;
  const status = params.get("status") as Status | null;
  return {
    tier: tier && TIERS.some((t) => t.id === tier) ? tier : "all",
    status: status && STATUSES.some((s) => s.value === status) ? status : "all",
    query: params.get("q") ?? "",
  };
}

const SIZE_RANK = { S: 0, entry: 0, M: 1, L: 2 } as const;

/** Group an already-sorted list into runs of the same category, keeping the catalog's order. */
function byCategory(items: ShowcaseItem[]): { category: string; items: ShowcaseItem[] }[] {
  const groups: { category: string; items: ShowcaseItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.category === item.category) last.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }
  // Small cards first so rows fill; Array.sort is stable, so the catalog order holds within a size.
  for (const group of groups) group.items.sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size]);
  return groups;
}

export function ShowcaseBrowser({
  items,
  blocks,
}: {
  items: ShowcaseItem[];
  blocks: BlockEntry[];
}) {
  const [tier, setTier] = useState<Tier>("all");
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");

  // Read the URL after mount, so the server render and the first client render agree.
  useEffect(() => {
    const initial = readParams();
    setTier(initial.tier);
    setStatus(initial.status);
    setQuery(initial.query);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tier !== "all") params.set("tier", tier);
    if (status !== "all") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }, [tier, status, query]);

  const all = useMemo<(CardItem & { kind: "item" | "block"; index: number })[]>(
    () => [
      ...items.map((item, index) => ({ ...item, kind: "item" as const, index })),
      ...blocks.map((block, index) => ({
        id: block.id,
        title: block.title,
        tier: "blocks" as const,
        status: block.status,
        category: block.product,
        kind: "block" as const,
        index,
      })),
    ],
    [items, blocks],
  );

  // Tier counts respect the other two filters, so a pill never promises more than it shows.
  const countsFor = useMemo(() => {
    const scoped = filterItems(all, { tier: "all", status, query });
    const counts = new Map<ShowcaseTier, number>();
    for (const row of scoped) counts.set(row.tier, (counts.get(row.tier) ?? 0) + 1);
    return counts;
  }, [all, status, query]);

  const visible = useMemo(
    () => filterItems(all, { tier, status, query }),
    [all, tier, status, query],
  );
  const visibleIds = useMemo(
    () => new Set(visible.map((row) => `${row.kind}:${row.id}`)),
    [visible],
  );

  const tierPills = [
    { value: "all", label: "All", count: [...countsFor.values()].reduce((a, b) => a + b, 0) },
    ...TIERS.map((t) => ({ value: t.id, label: t.title, count: countsFor.get(t.id) ?? 0 })),
  ];

  return (
    <div className="flex flex-col">
      <Toaster />
      <div className="flex flex-col gap-4 pb-8">
        <div className="max-w-md">
          <Input
            aria-label="Search the showcase"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components and blocks"
            prefix={<MagnifyingGlass aria-hidden="true" />}
            type="search"
            value={query}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterPills
            onValueChange={(value) => setTier(value as Tier)}
            options={tierPills}
            size="sm"
            value={tier}
          />
          <FilterPills
            onValueChange={(value) => setStatus(value as Status)}
            options={STATUSES}
            size="sm"
            value={status}
            variant="subtle"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          description="Try a shorter search, or clear the tier and status filters."
          title="Nothing matches"
        />
      ) : null}

      {TIERS.map((t) => {
        const tierItems = items.filter(
          (item) => item.tier === t.id && visibleIds.has(`item:${item.id}`),
        );
        const tierBlocks =
          t.id === "blocks" ? blocks.filter((block) => visibleIds.has(`block:${block.id}`)) : [];
        if (!tierItems.length && !tierBlocks.length) return null;

        return (
          <section
            aria-labelledby={`${t.id}-title`}
            className="@container/grid scroll-mt-20 border-border border-t py-12"
            id={t.id}
            key={t.id}
          >
            <h2
              className="text-2xl text-foreground tracking-heading [font-weight:var(--font-weight-heading,600)]"
              id={`${t.id}-title`}
            >
              {t.title}
              <span className="ms-3 font-normal text-base text-muted-foreground tabular-nums">
                {tierItems.length + tierBlocks.length}
              </span>
            </h2>
            <p className="mt-2 mb-8 max-w-2xl text-neutral-11 text-sm">{t.blurb}</p>

            {t.id === "lab" ? <LabBar /> : null}

            {tierBlocks.length ? (
              <ul className={GRID}>
                {tierBlocks.map((block) => (
                  <ShowcaseBlock block={block} key={block.id} />
                ))}
              </ul>
            ) : null}

            {byCategory(tierItems).map((group) => (
              <Fragment key={group.category}>
                <h3 className="mt-10 mb-4 text-muted-foreground text-sm first:mt-0">
                  {group.category}
                </h3>
                <ul className={GRID}>
                  {group.items.map((item) => (
                    <ShowcaseCard item={item} key={item.id} />
                  ))}
                </ul>
              </Fragment>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function LabBar() {
  return (
    <div className="mb-8 flex max-w-2xl flex-col gap-4 rounded-[var(--radius-lg)] border border-border p-5">
      <p className="font-medium text-foreground text-sm">How an effect leaves the Lab</p>
      <GraduationRules />
      <p className="text-muted-foreground text-xs">
        All five must hold. Each card names what it still lacks; its page shows the evidence.
      </p>
    </div>
  );
}
