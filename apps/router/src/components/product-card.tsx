"use client";

import { ArrowUpRight, BookOpen } from "@nebutra/icons";
import Link from "next/link";
import { BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import {
  CATEGORY_LABEL,
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

export function ProductCard({ m, layout = "tile" }: { m: ListingModel; layout?: "tile" | "row" }) {
  const desc = m.description || m.name;
  const detailHref = `/product/detail/${encodeURIComponent(m.publicModel)}`;
  const useHref = `/use?model=${encodeURIComponent(m.publicModel)}`;
  const provider = resolveListingProvider(m);
  const cover = PROVIDER_COVER[provider];

  if (layout === "row") {
    return (
      <article className="group overflow-hidden rounded-2xl border border-[var(--neutral-6)] bg-[var(--neutral-1)] transition hover:border-[var(--neutral-7)] hover:shadow-sm">
        <Link href={detailHref} className="flex min-h-[104px] items-stretch">
          <span
            className="relative flex w-[140px] shrink-0 items-center justify-center sm:w-[168px]"
            style={{ background: cover.wash }}
          >
            <span className="inline-flex max-w-[88%] items-center rounded-xl bg-white/95 px-2.5 py-2 shadow-sm ring-1 ring-black/5">
              <BrandPill provider={provider} size={18} tone="light" />
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
            <span className="truncate font-mono text-[13px] font-semibold text-[var(--neutral-12)]">
              {m.publicModel}
            </span>
            <span className="line-clamp-1 text-[12px] text-[var(--neutral-10)]">{desc}</span>
            <span className="text-[11px] text-[var(--neutral-9)]">
              {PROVIDER_LABEL[provider]} · {CATEGORY_LABEL[m.category]}
            </span>
          </span>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-[var(--neutral-6)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={detailHref}
        className="relative block h-[120px] shrink-0 overflow-hidden"
        aria-label={`${m.publicModel} 详情`}
      >
        <div className="absolute inset-0" style={{ background: cover.wash }} aria-hidden />
        <span className="absolute inset-0 flex items-center justify-center p-3">
          <span className="inline-flex max-w-[92%] items-center rounded-2xl bg-white/96 px-3 py-2 shadow-md ring-1 ring-black/[0.04]">
            <BrandPill provider={provider} size={20} tone="light" />
          </span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <Link href={detailHref} className="min-w-0">
          <p className="truncate font-mono text-[13px] font-semibold text-[var(--neutral-12)]">
            {m.publicModel}
          </p>
          <p
            className="mt-1 line-clamp-2 min-h-[2.35rem] text-[12px] text-[var(--neutral-10)]"
            title={desc}
          >
            {desc}
          </p>
        </Link>
        <div className="mt-2.5 flex items-center gap-1">
          <span className="rounded-md bg-[var(--neutral-3)] px-1.5 py-0.5 text-[10px] text-[var(--neutral-11)]">
            {CATEGORY_LABEL[m.category]}
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <Link
              href="/docs"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--neutral-10)] hover:bg-[var(--neutral-3)]"
              aria-label="文档"
              onClick={(e) => e.stopPropagation()}
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={useHref}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--neutral-10)] hover:bg-[var(--neutral-3)]"
              aria-label="试用"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
        <div className="mt-2.5 flex justify-between border-t border-[var(--neutral-4)] pt-2.5 font-mono text-[11px] text-[var(--blue-11)]">
          <span>入 {formatPrice(m.inputPerMTok)}/1M</span>
          <span>出 {formatPrice(m.outputPerMTok)}/1M</span>
        </div>
      </div>
    </article>
  );
}
