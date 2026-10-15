import { Button, EmptyState } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-marks";
import { ModelList, ModelTable, type ShelfSort } from "@/components/model-table";
import { SearchForm } from "@/components/search-form";
import {
  CATEGORY_LABEL,
  type ListingCategory,
  type ListingModel,
  type ListingProvider,
  PROVIDER_LABEL,
} from "@/lib/listing-catalog";

/** Modality order: language → image → video → audio → data/RAG → tools → rest. */
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

/** Minimum context window, in tokens. */
const CONTEXT_STEPS = [
  { id: "32k", min: 32_000 },
  { id: "128k", min: 128_000 },
  { id: "200k", min: 200_000 },
  { id: "1m", min: 1_000_000 },
] as const;
type ContextStep = (typeof CONTEXT_STEPS)[number]["id"] | "any";

/** Maximum input price, $ per 1M tokens. */
const PRICE_STEPS = [
  { id: "0.5", max: 0.5 },
  { id: "2", max: 2 },
  { id: "10", max: 10 },
] as const;
type PriceStep = (typeof PRICE_STEPS)[number]["id"] | "any";

const SORTS: readonly ShelfSort[] = [
  "default",
  "price-asc",
  "price-desc",
  "output-asc",
  "output-desc",
  "context-asc",
  "context-desc",
];

type Filters = {
  tag: ListingCategory | "all";
  brand: ListingProvider | "all";
  q: string;
  sort: ShelfSort;
  ctx: ContextStep;
  price: PriceStep;
  view: "list" | "table";
};

function parseSort(raw?: string): ShelfSort {
  return SORTS.includes(raw as ShelfSort) ? (raw as ShelfSort) : "default";
}

function parseCtx(raw?: string): ContextStep {
  return CONTEXT_STEPS.some((s) => s.id === raw) ? (raw as ContextStep) : "any";
}

function parsePrice(raw?: string): PriceStep {
  return PRICE_STEPS.some((s) => s.id === raw) ? (raw as PriceStep) : "any";
}

export type CatalogParams = {
  q?: string;
  brand?: string;
  tag?: string;
  sort?: string;
  ctx?: string;
  price?: string;
  view?: string;
};

function href(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.tag !== "all") sp.set("tag", f.tag);
  if (f.brand !== "all") sp.set("brand", f.brand);
  if (f.ctx !== "any") sp.set("ctx", f.ctx);
  if (f.price !== "any") sp.set("price", f.price);
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.sort !== "default") sp.set("sort", f.sort);
  if (f.view !== "table") sp.set("view", f.view);
  const qs = sp.toString();
  return qs ? `/models?${qs}` : "/models";
}

function matches(m: ListingModel, f: Filters, skip?: keyof Filters): boolean {
  if (skip !== "tag" && f.tag !== "all" && m.category !== f.tag) return false;
  if (skip !== "brand" && f.brand !== "all" && m.provider !== f.brand) return false;
  if (skip !== "ctx" && f.ctx !== "any") {
    const min = CONTEXT_STEPS.find((s) => s.id === f.ctx)?.min ?? 0;
    if (m.contextTokens < min) return false;
  }
  if (skip !== "price" && f.price !== "any") {
    const max = PRICE_STEPS.find((s) => s.id === f.price)?.max ?? Number.POSITIVE_INFINITY;
    // An unpriced model is not "cheap": it has no price to compare.
    if (!(m.inputPerMTok > 0 && m.inputPerMTok <= max)) return false;
  }
  const needle = f.q.trim().toLowerCase();
  if (needle) {
    return (
      m.publicModel.toLowerCase().includes(needle) ||
      m.name.toLowerCase().includes(needle) ||
      m.description.toLowerCase().includes(needle)
    );
  }
  return true;
}

/** Unknown values sort last in both directions — they are not zero. */
function sortModels(list: ListingModel[], sort: ShelfSort): ListingModel[] {
  if (sort === "default") return list;
  const [field, dir] = sort.split("-") as ["price" | "output" | "context", "asc" | "desc"];
  const value = (m: ListingModel) =>
    field === "price" ? m.inputPerMTok : field === "output" ? m.outputPerMTok : m.contextTokens;
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (!(va > 0) && !(vb > 0)) return 0;
    if (!(va > 0)) return 1;
    if (!(vb > 0)) return -1;
    return dir === "asc" ? va - vb : vb - va;
  });
}

/**
 * The catalogue, at OpenRouter's density: a filter rail (modality, provider,
 * context length, input price), search, a list/table toggle and sortable
 * columns. Everything is a link or a GET form, rendered on the server — it
 * works before hydration, every state is a shareable URL, and the page ships
 * no client JavaScript of its own.
 *
 * Counts beside each filter are computed with every *other* filter applied,
 * so a number always predicts the result of clicking it.
 */
export function ModelsCatalog({
  models,
  params,
}: {
  models: readonly ListingModel[];
  params: CatalogParams;
}) {
  const t = useTranslations("shelf.catalog");
  const tCat = useTranslations("category");
  const f: Filters = {
    tag: parseTag(params.tag),
    brand: parseBrand(params.brand),
    q: params.q?.trim() ?? "",
    sort: parseSort(params.sort),
    ctx: parseCtx(params.ctx),
    price: parsePrice(params.price),
    view: params.view === "list" ? "list" : "table",
  };

  const count = (skip: keyof Filters, test: (m: ListingModel) => boolean) =>
    models.filter((m) => matches(m, f, skip) && test(m)).length;

  const categories = CAT_ORDER.map((c) => ({ c, n: count("tag", (m) => m.category === c) })).filter(
    (x) => x.n > 0 || f.tag === x.c,
  );
  const providers = [...new Set(models.map((m) => m.provider))]
    .map((p) => ({ p, n: count("brand", (m) => m.provider === p) }))
    .filter((x) => x.n > 0 || f.brand === x.p)
    .sort((a, b) => b.n - a.n);
  const hasContext = models.some((m) => m.contextTokens > 0);
  const hasPrice = models.some((m) => m.inputPerMTok > 0);

  const list = sortModels(
    models.filter((m) => matches(m, f)),
    f.sort,
  );
  const filtered =
    f.tag !== "all" || f.brand !== "all" || f.q !== "" || f.ctx !== "any" || f.price !== "any";

  const rail = (
    <div className="space-y-8">
      <FilterGroup title={t("filter.modality")}>
        <FilterLink href={href({ ...f, tag: "all" })} active={f.tag === "all"}>
          {t("all")}
        </FilterLink>
        {categories.map(({ c, n }) => (
          <FilterLink key={c} href={href({ ...f, tag: c })} active={f.tag === c} count={n}>
            {tCat(c)}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title={t("filter.provider")}>
        <FilterLink href={href({ ...f, brand: "all" })} active={f.brand === "all"}>
          {t("all")}
        </FilterLink>
        {providers.map(({ p, n }) => (
          <FilterLink
            key={p}
            href={href({ ...f, brand: p })}
            active={f.brand === p}
            count={n}
            icon={<BrandMark provider={p} size={16} />}
          >
            {PROVIDER_LABEL[p]}
          </FilterLink>
        ))}
      </FilterGroup>
      {hasContext ? (
        <FilterGroup title={t("filter.context")}>
          <FilterLink href={href({ ...f, ctx: "any" })} active={f.ctx === "any"}>
            {t("filter.any")}
          </FilterLink>
          {CONTEXT_STEPS.map((s) => (
            <FilterLink
              key={s.id}
              href={href({ ...f, ctx: s.id })}
              active={f.ctx === s.id}
              count={count("ctx", (m) => m.contextTokens >= s.min)}
            >
              {t(`filter.ctx.${s.id}`)}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}
      {hasPrice ? (
        <FilterGroup title={t("filter.price")}>
          <FilterLink href={href({ ...f, price: "any" })} active={f.price === "any"}>
            {t("filter.any")}
          </FilterLink>
          {PRICE_STEPS.map((s) => (
            <FilterLink
              key={s.id}
              href={href({ ...f, price: s.id })}
              active={f.price === s.id}
              count={count("price", (m) => m.inputPerMTok > 0 && m.inputPerMTok <= s.max)}
            >
              {t("filter.priceUpTo", { price: s.id })}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}
    </div>
  );

  return (
    <div className="router-glow">
      <div className="router-market-shell pt-14 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl">{t("title")}</h1>
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
              ctx: f.ctx === "any" ? undefined : f.ctx,
              price: f.price === "any" ? undefined : f.price,
              sort: f.sort === "default" ? undefined : f.sort,
              view: f.view === "table" ? undefined : f.view,
            }}
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
          <aside aria-label={t("filters")} className="hidden lg:block">
            <div className="sticky top-20">{rail}</div>
          </aside>
          {/* Below lg the rail folds into a disclosure: native, no JS. */}
          <details className="group rounded-[var(--radius-lg)] border border-border lg:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {t("filters")}
              <span className="text-muted-foreground tabular-nums">
                {filtered ? t("filtersActive") : null}
              </span>
            </summary>
            <div className="border-t border-border p-4">{rail}</div>
          </details>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <p aria-live="polite" className="text-muted-foreground tabular-nums">
                {t("count", { count: list.length })}
                {filtered ? (
                  <>
                    {" · "}
                    <Link
                      href={href({
                        ...f,
                        tag: "all",
                        brand: "all",
                        q: "",
                        ctx: "any",
                        price: "any",
                      })}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {t("clear")}
                    </Link>
                  </>
                ) : null}
              </p>
              <nav
                aria-label={t("view.label")}
                className="flex items-center gap-1 rounded-[var(--radius-lg)] bg-muted p-1"
              >
                {(["table", "list"] as const).map((v) => (
                  <Link
                    key={v}
                    href={href({ ...f, view: v })}
                    aria-current={f.view === v ? "true" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-[var(--radius-md)] px-2.5 text-xs font-medium transition-colors",
                      f.view === v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`view.${v}`)}
                  </Link>
                ))}
              </nav>
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
            ) : f.view === "list" ? (
              <ModelList models={list} label={t("title")} />
            ) : (
              <ModelTable
                models={list}
                caption={t("title")}
                sort={f.sort}
                sortHref={(sort) => href({ ...f, sort })}
                stickyHeader
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function FilterLink({
  href: to,
  active,
  count,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={to}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex h-8 items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {count !== undefined ? (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}
