"use client";

import { ArrowUpRight, BookOpen, Star } from "@nebutra/icons";
import Link from "next/link";
import { BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import {
  CATEGORY_LABEL,
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

/**
 * 302 shelf card
 * - layout="tile"  上图下文（默认网格）
 * - layout="row"   左图右文（列表左右排列）
 */
export function ProductCard({ m, layout = "tile" }: { m: ListingModel; layout?: "tile" | "row" }) {
  const desc = m.description || m.name;
  /** 302: 卡面进详情；试用按钮进 Playground */
  const detailHref = `/product/detail/${encodeURIComponent(m.publicModel)}`;
  const useHref = `/use?model=${encodeURIComponent(m.publicModel)}`;
  const docsHref = "/docs";
  const provider = resolveListingProvider(m);
  const cover = PROVIDER_COVER[provider];

  if (layout === "row") {
    return (
      <article className="group overflow-hidden rounded-[20px] border border-[var(--neutral-6)] bg-[var(--neutral-1)] transition hover:border-[var(--neutral-7)] hover:shadow-md">
        <Link href={detailHref} className="flex min-h-[120px] items-stretch">
          {/* 左：品牌物料 */}
          <span
            className="relative flex w-[160px] shrink-0 items-center justify-center sm:w-[196px]"
            style={{ background: cover.wash }}
          >
            <span
              className={[
                "inline-flex max-w-[88%] flex-row flex-nowrap items-center rounded-xl px-2.5 py-2 shadow-sm ring-1",
                cover.dark
                  ? "bg-[var(--neutral-12)] ring-white/10"
                  : "bg-[var(--neutral-1)]/95 ring-black/5",
              ].join(" ")}
            >
              <BrandPill provider={provider} size={18} />
            </span>
          </span>

          {/* 右：文案 + 价 */}
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-mono text-[13px] font-semibold text-[var(--neutral-12)]">
                  {m.publicModel}
                </span>
                <span
                  className="mt-0.5 block line-clamp-1 text-[12px] text-[var(--neutral-10)]"
                  title={desc}
                >
                  {desc}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums text-[color:var(--blue-11)] sm:inline-flex">
                <span>入 {formatPrice(m.inputPerMTok)}</span>
                <span className="text-[var(--neutral-7)]">|</span>
                <span>出 {formatPrice(m.outputPerMTok)}</span>
                <span className="text-[var(--neutral-9)]">/1M</span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[var(--neutral-3)] px-1.5 py-0.5 text-[10px] text-[var(--neutral-11)]">
                模型
              </span>
              <span className="rounded-md bg-[color-mix(in_srgb,var(--blue-3)_55%,var(--neutral-1))] px-1.5 py-0.5 text-[10px] text-[var(--blue-11)]">
                {CATEGORY_LABEL[m.category]}
              </span>
              <span className="text-[10px] text-[var(--neutral-9)]">
                {PROVIDER_LABEL[provider]}
              </span>
              <span className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums text-[color:var(--blue-11)] sm:hidden">
                入 {formatPrice(m.inputPerMTok)} · 出 {formatPrice(m.outputPerMTok)}
              </span>
            </span>
          </span>
        </Link>
      </article>
    );
  }

  /* —— tile：上图下文 —— */
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[var(--rm-panel-border,var(--neutral-6))] bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_8px_24px_rgb(15_23_42/0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgb(15_23_42/0.09)]">
      <Link
        href={detailHref}
        className="relative block h-[140px] shrink-0 overflow-hidden md:h-[152px] xl:h-[160px]"
        aria-label={`${m.publicModel} 详情`}
      >
        <div className="absolute inset-0" style={{ background: cover.wash }} aria-hidden />
        <div
          className="pointer-events-none absolute -top-8 -right-6 h-32 w-32 rounded-full opacity-45 blur-3xl"
          style={{
            background: cover.dark
              ? "radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)"
              : "radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            color: cover.dark ? "#fff" : "#0f172a",
          }}
          aria-hidden
        />

        <span
          className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/75 text-[var(--neutral-9)] opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100"
          aria-hidden
        >
          <Star className="h-3.5 w-3.5" />
        </span>

        <span className="absolute inset-0 flex items-center justify-center p-4">
          <span
            className={[
              "inline-flex max-w-[92%] flex-row flex-nowrap items-center rounded-2xl px-3.5 py-2.5 shadow-[0_12px_36px_rgb(0_0_0/0.12)] ring-1",
              cover.dark ? "bg-white ring-white/10" : "bg-white/96 ring-black/[0.04]",
            ].join(" ")}
          >
            <BrandPill provider={provider} size={22} tone="light" />
          </span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <Link href={detailHref} className="min-w-0">
          <p className="truncate font-mono text-[13.5px] font-semibold tracking-tight text-[var(--neutral-12)]">
            {m.publicModel}
          </p>
          <p
            className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-[var(--neutral-10)]"
            title={desc}
          >
            {desc}
          </p>
        </Link>

        <div className="mt-3 flex items-center gap-1.5">
          <span className="rounded-md bg-[var(--neutral-3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--neutral-11)]">
            模型
          </span>
          <span className="rounded-md bg-[color-mix(in_srgb,var(--blue-3)_50%,white)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--blue-11)]">
            {CATEGORY_LABEL[m.category]}
          </span>
          <span className="sr-only">{PROVIDER_LABEL[provider]}</span>
          <span className="ml-auto flex items-center gap-0.5">
            <Link
              href={docsHref}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--neutral-10)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
              title="接入文档"
              aria-label="接入文档"
              onClick={(e) => e.stopPropagation()}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href={useHref}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--neutral-10)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
              title="试用"
              aria-label="试用"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--neutral-4)] pt-3 font-mono text-[12px] tabular-nums text-[var(--blue-11)]">
          <span className="min-w-0 truncate">入 {formatPrice(m.inputPerMTok)}/1M</span>
          <span className="shrink-0 text-[var(--neutral-6)]" aria-hidden>
            |
          </span>
          <span className="min-w-0 truncate text-right">出 {formatPrice(m.outputPerMTok)}/1M</span>
        </div>
      </div>
    </article>
  );
}

export const PROVIDER_WASH = Object.fromEntries(
  Object.entries(PROVIDER_COVER).map(([k, v]) => [k, v.wash]),
) as Record<ListingModel["provider"], string>;
