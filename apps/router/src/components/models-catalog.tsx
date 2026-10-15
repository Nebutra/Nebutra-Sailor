import { Button, EmptyState } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-marks";
import { ModelTable } from "@/components/model-table";
import { SearchForm } from "@/components/search-form";
import {
  CATEGORY_LABEL,
  type ListingCategory,
  type ListingModel,
  type ListingProvider,
  PROVIDER_LABEL,
} from "@/lib/listing-catalog";

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

type Filters = {
  tag: ListingCategory | "all";
  brand: ListingProvider | "all";
  q: string;
  sort: "default" | "price-asc" | "price-desc";
};

function parseSort(raw?: string): Filters["sort"] {
  return raw === "price-asc" || raw === "price-desc" ? raw : "default";
}

function buildModelsHref(opts: {
  tag?: ListingCategory | "all";
  brand?: ListingProvider | "all";
  q?: string;
  sort?: "default" | "price-asc" | "price-desc";
}): string {
  const sp = new URLSearchParams();
  if (opts.tag && opts.tag !== "all") sp.set("tag", opts.tag);
  if (opts.brand && opts.brand !== "all") sp.set("brand", opts.brand);
  if (opts.q?.trim()) sp.set("q", opts.q.trim());
  if (opts.sort && opts.sort !== "default") sp.set("sort", opts.sort);
  const qs = sp.toString();
  return qs ? `/models?${qs}` : "/models";
}

/**
 * The catalogue. Server-rendered and URL-driven: every filter is a link and
 * search is a GET form, so the page works before hydration, every state is a
 * shareable URL, and the list ships no client JavaScript.
 *
 * It replaced a client-side 302-style mega-panel (category rows × brand chips)
 * over a card grid; the layout now follows OpenRouter / Vercel AI Gateway — a
 * filter row over a comparable table.
 *
 * URL: ?tag=&brand=&q=&sort= (legacy `cate=api` is accepted and ignored).
 */
export function ModelsCatalog({
  models,
  initialQuery = "",
  initialBrand,
  initialTag,
  initialSort = "default",
}: {
  models: readonly ListingModel[];
  initialQuery?: string;
  initialBrand?: string;
  initialTag?: string;
  initialSort?: string;
}) {
  const t = useTranslations("shelf.catalog");
  const tCat = useTranslations("category");
  const f: Filters = {
    tag: parseTag(initialTag),
    brand: parseBrand(initialBrand),
    q: initialQuery,
    sort: parseSort(initialSort),
  };

  const categories = CAT_ORDER.map((c) => ({
    c,
    count: models.filter((m) => m.category === c && (f.brand === "all" || m.provider === f.brand))
      .length,
  })).filter((x) => x.count > 0);

  const brandCounts = new Map<ListingProvider, number>();
  for (const m of models) {
    if (f.tag !== "all" && m.category !== f.tag) continue;
    brandCounts.set(m.provider, (brandCounts.get(m.provider) ?? 0) + 1);
  }
  const brands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);

  const needle = f.q.trim().toLowerCase();
  let list = models.filter((m) => {
    if (f.tag !== "all" && m.category !== f.tag) return false;
    if (f.brand !== "all" && m.provider !== f.brand) return false;
    if (!needle) return true;
    return (
      m.publicModel.toLowerCase().includes(needle) ||
      m.name.toLowerCase().includes(needle) ||
      m.description.toLowerCase().includes(needle)
    );
  });
  if (f.sort === "price-asc") {
    list = [...list].sort((a, b) => (a.inputPerMTok || 999) - (b.inputPerMTok || 999));
  } else if (f.sort === "price-desc") {
    list = [...list].sort((a, b) => (b.inputPerMTok || 0) - (a.inputPerMTok || 0));
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );
  const filtered = f.tag !== "all" || f.brand !== "all" || f.q !== "";

  return (
    <div className="router-market-shell pt-8 pb-16 md:pt-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { count: models.length })}
          </p>
        </div>
        <SearchForm
          className="w-full md:max-w-sm"
          defaultValue={f.q}
          placeholder={t("searchPlaceholder")}
          label={t("searchPlaceholder")}
          submitLabel={t("search")}
          keep={{
            tag: f.tag === "all" ? undefined : f.tag,
            brand: f.brand === "all" ? undefined : f.brand,
            sort: f.sort === "default" ? undefined : f.sort,
          }}
        />
      </div>

      <nav aria-label={t("categories")} className="mt-6">
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <li>
            <Link
              href={buildModelsHref({ ...f, tag: "all" })}
              className={chip(f.tag === "all")}
              aria-current={f.tag === "all" ? "true" : undefined}
            >
              {t("all")}
            </Link>
          </li>
          {categories.map(({ c, count }) => (
            <li key={c}>
              <Link
                href={buildModelsHref({ ...f, tag: c })}
                className={chip(f.tag === c)}
                aria-current={f.tag === c ? "true" : undefined}
              >
                {tCat(c)}
                <span className="tabular-nums opacity-70">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label={t("providers")} className="mt-3">
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {brands.map(([p, count]) => (
            <li key={p}>
              <Link
                href={buildModelsHref({ ...f, brand: f.brand === p ? "all" : p })}
                className={chip(f.brand === p)}
                aria-current={f.brand === p ? "true" : undefined}
              >
                <BrandMark provider={p} size={14} />
                {PROVIDER_LABEL[p]}
                <span className="tabular-nums opacity-70">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p aria-live="polite" className="tabular-nums">
          {t("count", { count: list.length })}
        </p>
        <div className="flex items-center gap-3">
          {filtered ? (
            <Link href="/models" className="transition-colors hover:text-foreground">
              {t("clear")}
            </Link>
          ) : null}
          <Link
            href={buildModelsHref({
              ...f,
              sort: f.sort === "price-asc" ? "price-desc" : "price-asc",
            })}
            className="transition-colors hover:text-foreground"
          >
            {f.sort === "price-asc"
              ? t("sortPriceDesc")
              : f.sort === "price-desc"
                ? t("sortPriceAsc")
                : t("sortPrice")}
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={t("noMatchTitle")}
          description={t("noMatchBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/models">{t("clear")}</Link>
            </Button>
          }
        />
      ) : (
        <ModelTable models={list} caption={t("title")} />
      )}
    </div>
  );
}
