"use client";

import { ArrowUpRight, BookOpen } from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import { useCategoryLabel } from "@/hooks/use-category-label";
import {
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

export function ProductCard({ m, layout = "tile" }: { m: ListingModel; layout?: "tile" | "row" }) {
  const t = useTranslations("card");
  const categoryLabel = useCategoryLabel();
  const desc = m.description || m.name;
  const detailHref = `/product/detail/${encodeURIComponent(m.publicModel)}`;
  const useHref = `/use?model=${encodeURIComponent(m.publicModel)}`;
  const provider = resolveListingProvider(m);
  const cover = PROVIDER_COVER[provider];

  if (layout === "row") {
    return (
      <article className="group overflow-hidden rounded-2xl border border-neutral-6 bg-neutral-1 transition-[border-color,box-shadow] hover:border-neutral-7 hover:shadow-sm">
        <Link href={detailHref} className="flex min-h-[104px] items-stretch">
          <span
            className="relative flex w-[140px] shrink-0 items-center justify-center sm:w-[168px]"
            style={{ background: cover.wash }}
          >
            <span className="inline-flex max-w-[88%] items-center rounded-xl bg-card/95 px-2.5 py-2 shadow-ambient-sm ring-1 ring-border">
              <BrandPill provider={provider} size={18} />
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
            <span className="truncate font-mono text-sm font-semibold text-neutral-12">
              {m.publicModel}
            </span>
            <span className="line-clamp-1 text-xs text-muted-foreground">{desc}</span>
            <span className="text-xs text-muted-foreground">
              {PROVIDER_LABEL[provider]} · {categoryLabel(m.category)}
            </span>
          </span>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-6 bg-neutral-1 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-neutral-7 hover:shadow-md motion-reduce:hover:translate-y-0">
      <Link
        href={detailHref}
        className="relative block h-[120px] shrink-0 overflow-hidden"
        aria-label={t("details", { model: m.publicModel })}
      >
        <div className="absolute inset-0" style={{ background: cover.wash }} aria-hidden />
        <span className="absolute inset-0 flex items-center justify-center p-3">
          <span className="inline-flex max-w-[92%] items-center rounded-2xl bg-card/95 px-3 py-2 shadow-ambient-md ring-1 ring-border">
            <BrandPill provider={provider} size={20} />
          </span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <Link href={detailHref} className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-neutral-12">
            {m.publicModel}
          </p>
          <p className="mt-1 line-clamp-2 min-h-[2.35rem] text-xs text-muted-foreground">{desc}</p>
        </Link>
        <div className="mt-2.5 flex items-center gap-1">
          <span className="rounded-md bg-neutral-3 px-1.5 py-0.5 text-xs text-neutral-11">
            {categoryLabel(m.category)}
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <Link
              href="/docs"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={t("docs")}
              onClick={(e) => e.stopPropagation()}
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={useHref}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={t("try")}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
        <div className="mt-2.5 flex justify-between border-t border-neutral-4 pt-2.5 font-mono text-xs text-blue-11">
          <span>{t("input", { price: formatPrice(m.inputPerMTok) })}</span>
          <span>{t("output", { price: formatPrice(m.outputPerMTok) })}</span>
        </div>
      </div>
    </article>
  );
}
