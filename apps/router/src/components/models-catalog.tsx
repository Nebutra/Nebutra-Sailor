"use client";

import { ChevronDown, ChevronUp } from "@nebutra/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ProductCard } from "@/components/product-card";
import {
  CATEGORY_LABEL,
  type ListingCategory,
  type ListingModel,
  type ListingProvider,
  PROVIDER_LABEL,
} from "@/lib/listing-catalog";
import { MarketIcon } from "@/lib/market-icons";
import { API_CATEGORY_ICON } from "@/lib/market-taxonomy";

/** 302 模态序：语言 → 图 → 视频 → 音 → 数据/RAG → 工具 → 其余 */
const CAT_ORDER: ListingCategory[] = [
  "chat",
  "reasoning",
  "fast",
  "image",
  "video",
  "audio",
  "multimodal",
  "data",
  "rag",
  "tools",
  "other",
];

const BRAND_ALIASES: Record<string, ListingProvider> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  gemini: "google",
  xai: "xai",
  grok: "xai",
  deepseek: "deepseek",
  moonshot: "moonshot",
  kimi: "moonshot",
  mistral: "mistral",
  meta: "meta",
  llama: "meta",
  qwen: "qwen",
  通义千问: "qwen",
  zhipu: "zhipu",
  智谱: "zhipu",
  minimax: "minimax",
  cohere: "cohere",
  perplexity: "perplexity",
  baichuan: "baichuan",
  百川: "baichuan",
  yi: "yi",
  零一万物: "yi",
  doubao: "doubao",
  豆包: "doubao",
  hunyuan: "hunyuan",
  腾讯混元: "hunyuan",
  nvidia: "nvidia",
  nemotron: "nvidia",
  nv: "nvidia",
};

function parseBrand(raw?: string): ListingProvider | "all" {
  if (!raw) return "all";
  const key = raw.toLowerCase();
  return BRAND_ALIASES[key] ?? (key in PROVIDER_LABEL ? (key as ListingProvider) : "all");
}

function parseTag(raw?: string): ListingCategory | "all" {
  if (!raw) return "all";
  const key = raw.toLowerCase();
  if (key === "all" || key === "全部") return "all";
  // accept category keys or Chinese labels (full ListingCategory set)
  for (const c of CAT_ORDER) {
    if (c === key || CATEGORY_LABEL[c] === raw) return c;
  }
  for (const [c, label] of Object.entries(CATEGORY_LABEL) as [ListingCategory, string][]) {
    if (c === key || label === raw) return c;
  }
  return "all";
}

function buildModelsHref(opts: {
  tag?: ListingCategory | "all";
  brand?: ListingProvider | "all";
  q?: string;
  sort?: "default" | "price-asc" | "price-desc";
}): string {
  const sp = new URLSearchParams();
  sp.set("cate", "api");
  if (opts.tag && opts.tag !== "all") sp.set("tag", opts.tag);
  if (opts.brand && opts.brand !== "all") sp.set("brand", opts.brand);
  if (opts.q?.trim()) sp.set("q", opts.q.trim());
  if (opts.sort && opts.sort !== "default") sp.set("sort", opts.sort);
  const qs = sp.toString();
  return qs ? `/models?${qs}` : "/models";
}

/**
 * 302 /product/list style:
 * collapsible taxonomy mega-panel (tag rows × brand chips) + card shelf
 * URL: ?cate=api&tag=&brand=&q=&sort=
 */
export function ModelsCatalog({
  models,
  sourceNote,
  initialQuery = "",
  initialBrand,
  initialTag,
  initialSort = "default",
}: {
  models: readonly ListingModel[];
  sourceNote: string;
  initialQuery?: string;
  initialBrand?: string;
  initialTag?: string;
  initialSort?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState<ListingCategory | "all">(() => parseTag(initialTag));
  const [brand, setBrand] = useState<ListingProvider | "all">(() => parseBrand(initialBrand));
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc">(() => {
    if (initialSort === "price-asc" || initialSort === "price-desc") return initialSort;
    return "default";
  });
  const [taxonomyOpen, setTaxonomyOpen] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  const pushFilters = useCallback(
    (next: {
      tag?: ListingCategory | "all";
      brand?: ListingProvider | "all";
      q?: string;
      sort?: "default" | "price-asc" | "price-desc";
    }) => {
      const href = buildModelsHref({
        tag: next.tag ?? cat,
        brand: next.brand ?? brand,
        q: next.q ?? q,
        sort: next.sort ?? sort,
      });
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [brand, cat, q, router, sort],
  );

  const taxonomy = useMemo(() => {
    return CAT_ORDER.map((c) => {
      const items = models.filter((m) => m.category === c);
      if (!items.length) return null;
      const brandMap = new Map<ListingProvider, number>();
      for (const m of items) brandMap.set(m.provider, (brandMap.get(m.provider) ?? 0) + 1);
      const brands = [...brandMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([p, n]) => ({ provider: p, label: PROVIDER_LABEL[p], count: n }));
      return { c, label: CATEGORY_LABEL[c], count: items.length, brands };
    }).filter(Boolean) as Array<{
      c: ListingCategory;
      label: string;
      count: number;
      brands: Array<{ provider: ListingProvider; label: string; count: number }>;
    }>;
  }, [models]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = models.filter((m) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (brand !== "all" && m.provider !== brand) return false;
      if (!needle) return true;
      return (
        m.publicModel.toLowerCase().includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        m.description.toLowerCase().includes(needle)
      );
    });
    if (sort === "price-asc") {
      list = [...list].sort((a, b) => (a.inputPerMTok || 999) - (b.inputPerMTok || 999));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => (b.inputPerMTok || 0) - (a.inputPerMTok || 0));
    }
    return list;
  }, [models, q, cat, brand, sort]);

  const title =
    cat === "all"
      ? brand === "all"
        ? "全部模型"
        : PROVIDER_LABEL[brand]
      : brand === "all"
        ? CATEGORY_LABEL[cat]
        : `${CATEGORY_LABEL[cat]} · ${PROVIDER_LABEL[brand]}`;

  return (
    <div className="router-market-shell py-6 md:py-8">
      {/* taxonomy mega-panel */}
      <div className="rounded-2xl border border-[var(--neutral-6)]">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 md:px-4">
          <span className="text-[12px] font-semibold">分类</span>
          <span className="rounded-full bg-[var(--neutral-12)] px-2 py-0.5 text-[10px] font-medium text-[var(--neutral-1)]">
            API
          </span>
          <Link
            href="/?product_type=tool"
            className="rounded-full bg-[var(--neutral-3)] px-2 py-0.5 text-[10px] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]"
          >
            应用
          </Link>
          <input
            data-allow-native
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") pushFilters({ q });
            }}
            onBlur={() => pushFilters({ q })}
            placeholder="在结果中筛选…"
            className="ml-auto h-8 w-full max-w-[220px] rounded-full border border-[var(--neutral-6)] px-3 text-[12px] outline-none md:w-auto"
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]"
            aria-expanded={taxonomyOpen}
            aria-label={taxonomyOpen ? "折叠分类" : "展开分类"}
            onClick={() => setTaxonomyOpen((v) => !v)}
          >
            {taxonomyOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        {taxonomyOpen ? (
          <div className="space-y-2.5 border-t border-[var(--neutral-6)] px-3 py-3 md:px-4">
            {taxonomy.map((row) => (
              <div key={row.c} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = cat === row.c ? "all" : row.c;
                    setCat(next);
                    setBrand("all");
                    pushFilters({ tag: next, brand: "all" });
                  }}
                  className={[
                    "inline-flex shrink-0 items-center gap-1 text-[12px] font-medium",
                    cat === row.c
                      ? "text-[var(--neutral-12)] underline decoration-2 underline-offset-4"
                      : "text-[var(--neutral-11)] hover:text-[var(--neutral-12)]",
                  ].join(" ")}
                >
                  <MarketIcon name={API_CATEGORY_ICON[row.c]} className="h-3.5 w-3.5 opacity-70" />
                  {row.label}
                  <span className="ml-1 font-normal text-[var(--neutral-9)]">{row.count}</span>
                </button>
                {row.brands.map((b) => {
                  const active = cat === row.c && brand === b.provider;
                  return (
                    <button
                      key={b.provider}
                      type="button"
                      onClick={() => {
                        setCat(row.c);
                        setBrand(b.provider);
                        pushFilters({ tag: row.c, brand: b.provider });
                      }}
                      className={[
                        "text-[12px]",
                        active
                          ? "font-semibold text-[var(--neutral-12)]"
                          : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
                      ].join(" ")}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[15px] font-semibold">{title}</h1>
        <div className="flex items-center gap-3 text-[12px] text-[var(--neutral-11)]">
          <button
            type="button"
            className={sort.startsWith("price") ? "font-semibold text-[var(--neutral-12)]" : ""}
            onClick={() => {
              const next =
                sort === "price-asc"
                  ? "price-desc"
                  : sort === "price-desc"
                    ? "default"
                    : "price-asc";
              setSort(next);
              pushFilters({ sort: next });
            }}
          >
            价格 {sort === "price-asc" ? "↑" : sort === "price-desc" ? "↓" : "↕"}
          </button>
          <span className="tabular-nums">{filtered.length} 个</span>
          <div className="flex rounded-lg border border-[var(--neutral-6)] p-0.5">
            <button
              type="button"
              aria-label="网格视图"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                view === "grid"
                  ? "bg-[var(--neutral-3)] text-[var(--neutral-12)]"
                  : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
              ].join(" ")}
            >
              <MarketIcon name="grid" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="列表视图"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                view === "list"
                  ? "bg-[var(--neutral-3)] text-[var(--neutral-12)]"
                  : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
              ].join(" ")}
            >
              <MarketIcon name="list" className="h-3.5 w-3.5" />
            </button>
          </div>
          {pathname.startsWith("/models") && (cat !== "all" || brand !== "all" || q) ? (
            <Link
              href="/models?cate=api"
              className="hover:text-[var(--neutral-12)]"
              onClick={() => {
                setCat("all");
                setBrand("all");
                setQ("");
              }}
            >
              清除筛选
            </Link>
          ) : null}
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((m) => (
            <ProductCard key={m.publicModel} m={m} layout="tile" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => (
            <ProductCard key={m.publicModel} m={m} layout="row" />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-[var(--neutral-10)]">没有匹配的模型</p>
      ) : null}
      <p className="mt-4 text-[11px] text-[var(--neutral-10)]">{sourceNote}</p>
    </div>
  );
}
