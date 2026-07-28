"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { BrandMark } from "@/components/brand-marks";
import { ForgeMark } from "@/components/forge-mark";
import { MarketBannerCarousel } from "@/components/market-banner-carousel";
import { ProductCard } from "@/components/product-card";
import { type ListingModel, type ListingProvider, PROVIDER_LABEL } from "@/lib/listing-catalog";
import { buildMarketBanners } from "@/lib/market-banners";
import { MarketIcon } from "@/lib/market-icons";
import {
  BRAND_BLURB,
  MARKET_API_TAXONOMY,
  MARKET_SHORTCUTS,
  TOOL_TAXONOMY,
} from "@/lib/market-taxonomy";

type CategoryRow = {
  id: string;
  label: string;
  icon: (typeof MARKET_API_TAXONOMY)[number]["icon"];
  hint: string;
  listingTags: readonly string[];
  brands: Array<{
    provider: ListingProvider;
    label: string;
    blurb: string;
    count: number;
  }>;
  count: number;
};

/**
 * 302 homepage body (chrome = MarketShell):
 * left taxonomy + brand hover flyout · center carousel · right Hi · card shelf
 */
export function MarketHome({
  models,
  sourceNote,
  productType = "api",
}: {
  models: readonly ListingModel[];
  sourceNote: string;
  productType?: "api" | "tool";
}) {
  const tMarket = useTranslations("market");
  const tApi = useTranslations("apiTaxonomy");
  const tTool = useTranslations("toolTaxonomy");
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const [tab, setTab] = useState<"new" | "hot" | "forYou">("new");
  const [view, setView] = useState<"grid" | "list">("grid");
  const railRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCat = useCallback((id: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoverCat(id);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setHoverCat(null);
      setFlyoutPos(null);
      closeTimerRef.current = null;
    }, 140);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  /** fixed 浮层坐标：贴着分类轨右缘，避免被 grid 裁切/压盖 */
  useEffect(() => {
    if (!hoverCat || !railRef.current) {
      setFlyoutPos(null);
      return;
    }
    const update = () => {
      const el = railRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setFlyoutPos({ top: Math.max(8, r.top), left: r.right + 6 });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hoverCat]);

  const banners = useMemo(() => buildMarketBanners(models), [models]);

  /** 302 分类轨：配置品牌（flyout）+ 短 hint 副文案 */
  const categoryRows = useMemo(() => {
    return MARKET_API_TAXONOMY.map((row) => {
      const tagSet = new Set(row.listingTags);
      const items = models.filter((m) => tagSet.has(m.category));
      const liveByProvider = new Map<ListingProvider, number>();
      for (const m of items) {
        liveByProvider.set(m.provider, (liveByProvider.get(m.provider) ?? 0) + 1);
      }
      const brands = row.brands.map((provider) => ({
        provider,
        label: PROVIDER_LABEL[provider],
        blurb: BRAND_BLURB[provider] ?? PROVIDER_LABEL[provider],
        count: liveByProvider.get(provider) ?? 0,
      }));
      const labelKey = `${row.id}.label` as const;
      const hintKey = `${row.id}.hint` as const;
      return {
        id: row.id,
        label: tApi.has(labelKey) ? tApi(labelKey) : row.label,
        icon: row.icon,
        hint: tApi.has(hintKey) ? tApi(hintKey) : row.hint,
        listingTags: row.listingTags,
        brands,
        count: items.length,
      };
    });
  }, [models, tApi]);

  const grid = useMemo(() => {
    let pool = [...models];
    if (tab === "hot") {
      pool = pool.sort((a, b) => (b.inputPerMTok || 0) - (a.inputPerMTok || 0));
    } else if (tab === "forYou") {
      pool = pool.filter((m) => m.sellable || m.routed);
    }

    const byBrand = new Map<string, ListingModel[]>();
    for (const m of pool) {
      const key = m.provider;
      const arr = byBrand.get(key) ?? [];
      arr.push(m);
      byBrand.set(key, arr);
    }
    const queues = [...byBrand.values()].map((arr) => [...arr]);
    const out: ListingModel[] = [];
    let guard = 0;
    while (out.length < 15 && queues.some((q) => q.length) && guard < 200) {
      guard++;
      for (const q of queues) {
        const next = q.shift();
        if (next) out.push(next);
        if (out.length >= 15) break;
      }
    }
    return out;
  }, [models, tab]);

  const hoverRow = categoryRows.find((r) => r.id === hoverCat) ?? null;

  const sellableCount = useMemo(
    () => models.filter((m) => m.sellable || m.routed).length,
    [models],
  );

  if (productType === "tool") {
    return (
      <div className="router-market-shell py-3 md:py-4">
        {/* 比例：窄导航 · 主视觉 · 紧凑 Hi —— 中间占主导 */}
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,212px)_minmax(0,1fr)_minmax(236px,252px)] lg:items-stretch xl:grid-cols-[220px_minmax(0,1fr)_264px] xl:gap-4 2xl:grid-cols-[228px_minmax(0,1fr)_272px]">
          <aside className="router-market-panel p-1.5">
            <div className="mb-0.5 flex items-center justify-between px-2 py-1.5">
              <span className="text-[12px] font-semibold">{tMarket("categories")}</span>
              <span className="rounded-full bg-[var(--neutral-12)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-1)]">
                {tMarket("apps")}
              </span>
            </div>
            {TOOL_TAXONOMY.map((row) => {
              const labelKey = `${row.id}.label` as const;
              const chipsKey = `${row.id}.chips` as const;
              const label = tTool.has(labelKey) ? tTool(labelKey) : row.label;
              const chips = tTool.has(chipsKey)
                ? tTool(chipsKey)
                : row.chips.slice(0, 2).join(" · ");
              return (
                <a
                  key={row.id}
                  href={row.href}
                  className="group flex w-full items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-1.5 text-left transition hover:bg-[var(--neutral-2)]/90"
                >
                  <span
                    className="h-7 w-0.5 shrink-0 rounded-full bg-transparent group-hover:bg-[var(--neutral-6)]"
                    aria-hidden
                  />
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--neutral-10)] group-hover:bg-[var(--neutral-3)]/80 group-hover:text-[var(--neutral-12)]">
                    <MarketIcon name={row.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-[var(--neutral-12)]">
                      {label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--neutral-9)]">
                      {chips}
                    </span>
                  </span>
                  <span className="text-[11px] text-[var(--neutral-8)] opacity-0 group-hover:opacity-100">
                    ›
                  </span>
                </a>
              );
            })}
          </aside>

          <section className="flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl bg-[var(--neutral-12)] p-6 text-[var(--neutral-1)]">
            <div>
              <div className="flex items-center gap-2">
                <ForgeMark className="h-8 w-8" />
                <p className="text-[12px] text-[var(--neutral-8)]">{tMarket("newRelease")}</p>
              </div>
              <h1 className="mt-2 text-[26px] font-semibold tracking-tight md:text-[30px]">
                {tMarket("forgeTitle")}
              </h1>
              <p className="mt-2 max-w-lg text-[13px] text-[var(--neutral-7)]">
                {tMarket("forgeBlurb")}
              </p>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_FORGE_URL ?? "http://localhost:3105"}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--neutral-1)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--neutral-12)]"
            >
              <ForgeMark className="h-4 w-4" />
              {tMarket("openForge")}
            </a>
          </section>

          <HiPanel sellableCount={sellableCount} />
        </div>
        <p className="mt-6 text-[11px] text-[var(--neutral-10)]">{sourceNote}</p>
      </div>
    );
  }

  const flyout =
    typeof document !== "undefined" && hoverRow && flyoutPos
      ? createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: portal flyout hover bridge
          <section
            aria-label={hoverRow.label}
            className="fixed z-[200] hidden w-[min(520px,calc(100vw-240px))] lg:block"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={() => openCat(hoverRow.id)}
            onMouseLeave={scheduleClose}
          >
            <CategoryFlyout row={hoverRow} />
          </section>,
          document.body,
        )
      : null;

  return (
    <div className="router-market-shell py-3 md:py-4">
      {/* flex 布局：左轨独立 stacking，浮层用 portal fixed，不再被 grid 裁切 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
        <aside
          ref={railRef}
          className="router-market-panel relative z-20 flex w-full shrink-0 flex-col p-1.5 lg:w-[212px] xl:w-[220px] 2xl:w-[228px]"
          onMouseLeave={scheduleClose}
        >
          <div className="mb-0.5 flex items-center justify-between px-2 py-1.5">
            <span className="text-[12px] font-semibold">{tMarket("categories")}</span>
            <div className="flex gap-1">
              <span className="rounded-full bg-[var(--neutral-12)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-1)]">
                API
              </span>
              <Link
                href="/?product_type=tool"
                className="rounded-full bg-[var(--neutral-3)] px-1.5 py-0.5 text-[10px] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]"
              >
                {tMarket("apps")}
              </Link>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            {categoryRows.map((row) => {
              const primaryTag = row.listingTags[0] ?? "chat";
              const active = hoverCat === row.id;
              return (
                <div key={row.id} className="relative">
                  <Link
                    href={`/models?cate=api&tag=${encodeURIComponent(primaryTag)}`}
                    className={[
                      "group flex w-full items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-1 text-left transition",
                      active ? "bg-[var(--neutral-3)]/80" : "hover:bg-[var(--neutral-2)]/90",
                    ].join(" ")}
                    onMouseEnter={() => openCat(row.id)}
                    onFocus={() => openCat(row.id)}
                  >
                    <span
                      className={[
                        "h-7 w-0.5 shrink-0 rounded-full transition",
                        active
                          ? "bg-[var(--blue-9)]"
                          : "bg-transparent group-hover:bg-[var(--neutral-6)]",
                      ].join(" ")}
                      aria-hidden
                    />
                    <span
                      className={[
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--neutral-10)] transition",
                        active
                          ? "bg-white/80 text-[var(--neutral-12)]"
                          : "group-hover:bg-[var(--neutral-3)]/80 group-hover:text-[var(--neutral-12)]",
                      ].join(" ")}
                    >
                      <MarketIcon name={row.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-[13px] font-medium tracking-tight text-[var(--neutral-12)]">
                          {row.label}
                        </span>
                        {row.count > 0 ? (
                          <span className="shrink-0 text-[10px] tabular-nums text-[var(--neutral-9)]">
                            {row.count}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--neutral-9)]">
                        {row.hint}
                      </span>
                    </span>
                    <span className="text-[11px] text-[var(--neutral-8)] opacity-0 transition group-hover:opacity-100">
                      ›
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>

          <Link
            href="/models?cate=api"
            className="mt-auto flex h-8 items-center px-2 text-[12px] text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
          >
            {tMarket("allApi")}
          </Link>
        </aside>

        <div className="relative z-0 min-w-0 flex-1">
          <MarketBannerCarousel banners={banners} />
        </div>

        <div className="relative z-0 w-full shrink-0 lg:flex lg:w-[252px] lg:flex-col xl:w-[264px] 2xl:w-[272px]">
          <HiPanel sellableCount={sellableCount} />
        </div>
      </div>

      {flyout}

      <div className="mt-8 md:mt-10">
        <div className="mb-4 flex items-center gap-6 text-[15px]">
          {(
            [
              ["new", tMarket("new")],
              ["hot", tMarket("hot")],
              ["forYou", tMarket("forYou")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "relative pb-1 transition",
                tab === id
                  ? "font-semibold text-[var(--neutral-12)] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-[var(--blue-9)]"
                  : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-[10px] border border-[var(--rm-panel-border)] bg-white p-0.5 shadow-[0_1px_2px_rgb(15_23_42/0.03)]">
              <button
                type="button"
                aria-label={tMarket("gridView")}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition",
                  view === "grid"
                    ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                    : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
                ].join(" ")}
              >
                <MarketIcon name="grid" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={tMarket("listView")}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition",
                  view === "list"
                    ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                    : "text-[var(--neutral-10)] hover:text-[var(--neutral-12)]",
                ].join(" ")}
              >
                <MarketIcon name="list" className="h-3.5 w-3.5" />
              </button>
            </div>
            <Link
              href="/models?cate=api"
              className="text-[12px] font-medium text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
            >
              {tMarket("all")}
            </Link>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {grid.map((m) => (
              <ProductCard key={m.publicModel} m={m} layout="tile" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {grid.map((m) => (
              <ProductCard key={m.publicModel} m={m} layout="row" />
            ))}
          </div>
        )}
        {/* 货架说明弱化为脚注，避免 lab 感抢戏 */}
        <p className="mt-8 text-center text-[11px] tracking-wide text-[var(--neutral-9)]">
          {sourceNote}
        </p>
      </div>
    </div>
  );
}

function CategoryFlyout({ row }: { row: CategoryRow }) {
  const tMarket = useTranslations("market");
  return (
    <div className="rounded-2xl border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 shadow-[0_20px_56px_rgb(15_23_42/0.18)]">
      <p className="px-1 pb-2.5 text-[13px] font-semibold text-[var(--neutral-12)]">{row.label}</p>
      <div className="grid max-h-[min(440px,70vh)] grid-cols-2 gap-2 overflow-y-auto pr-0.5 xl:grid-cols-3">
        {row.brands.map((b) => {
          const primaryTag = row.listingTags[0] ?? "chat";
          return (
            <Link
              key={b.provider}
              href={`/models?cate=api&tag=${encodeURIComponent(primaryTag)}&brand=${encodeURIComponent(b.provider)}`}
              className="group flex min-h-[88px] items-start gap-2.5 rounded-xl border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 transition hover:border-[var(--neutral-7)] hover:bg-[var(--neutral-2)]/60 hover:shadow-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--neutral-12)]">
                    {b.label}
                  </span>
                  {b.count > 0 ? (
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--neutral-9)]">
                      {b.count}
                    </span>
                  ) : null}
                </span>
                <span
                  className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--neutral-10)]"
                  title={b.blurb}
                >
                  {b.blurb}
                </span>
              </span>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--neutral-2)] ring-1 ring-[var(--neutral-6)]/80">
                <BrandMark provider={b.provider} size={26} surface="light" />
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href={`/models?cate=api&tag=${encodeURIComponent(row.listingTags[0] ?? "chat")}`}
        className="mt-2 flex h-8 items-center px-1 text-[12px] text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
      >
        {tMarket("viewAll", { label: row.label })}
      </Link>
    </div>
  );
}

/**
 * 右栏 Hi：紧凑侧栏，不与中部轮播抢戏
 * 结构：问候 + CTA · 2×3 快捷 · 底栏统计（去掉重复的「快捷使用」大卡）
 */
function HiPanel({ sellableCount }: { sellableCount: number }) {
  const tMarket = useTranslations("market");
  const tShort = useTranslations("shortcuts");
  return (
    <aside className="router-market-panel flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(165deg,color-mix(in_srgb,var(--blue-3)_22%,white)_0%,#fff_60%)] p-4 xl:p-5">
      <div className="flex items-center gap-2.5">
        <BrandLogo variant="mark" className="h-8 w-8 [&_img]:h-8 [&_img]:w-8" />
        <p className="text-[16px] font-semibold tracking-tight text-[var(--neutral-12)]">Hi~</p>
      </div>

      <p className="mt-3 text-[13px] leading-snug font-semibold text-[var(--neutral-12)]">
        {tMarket("hiTitle")}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--neutral-10)]">
        {tMarket("hiSubtitle")}
      </p>

      <div className="mt-3.5">
        <AuthActions variant="cta" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-x-1 gap-y-3">
        {MARKET_SHORTCUTS.map((s) => {
          const shortKey = s.href.replace(/^\//, "") as
            | "dashboard"
            | "keys"
            | "wallet"
            | "use"
            | "docs"
            | "models";
          const shortLabel = tShort.has(shortKey) ? tShort(shortKey) : s.label;
          return (
            <Link
              key={s.href}
              href={s.href}
              title={shortLabel}
              aria-label={shortLabel}
              className="group flex flex-col items-center gap-1 text-center"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--neutral-2)] text-[var(--neutral-11)] transition group-hover:bg-[var(--neutral-3)] group-hover:text-[var(--neutral-12)]">
                <MarketIcon name={s.icon} className="h-4 w-4" />
              </span>
              <span className="w-full truncate text-center text-[11px] leading-none font-medium text-[var(--neutral-11)]">
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 底栏：单行双指标，不再叠大卡 */}
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--neutral-5)]/80 pt-3">
        <Link
          href="/models?cate=api"
          className="rounded-xl bg-[var(--neutral-2)]/80 px-2.5 py-2 transition hover:bg-[var(--neutral-3)]"
        >
          <p className="text-[10px] tracking-wide text-[var(--neutral-9)]">{tMarket("sellable")}</p>
          <p className="mt-0.5 text-[17px] font-semibold tabular-nums tracking-tight text-[var(--neutral-12)]">
            {sellableCount}
          </p>
        </Link>
        <Link
          href="/wallet"
          className="rounded-xl bg-[var(--neutral-2)]/80 px-2.5 py-2 transition hover:bg-[var(--neutral-3)]"
        >
          <p className="text-[10px] tracking-wide text-[var(--neutral-9)]">{tShort("wallet")}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--neutral-12)]">
            {tMarket("walletTopup")}
          </p>
        </Link>
      </div>
    </aside>
  );
}
