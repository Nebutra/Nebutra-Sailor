"use client";

import { ArrowRight } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { ShowcaseDemo } from "@/components/showcase-demo";
import { GraduationSummary, StatusBadge } from "@/components/showcase-status";
import type { ShowcaseItem } from "@/lib/showcase";
import { type CardSize, widthStep } from "@/lib/showcase-model";

/**
 * One catalog entry as a card. The demo inside is never scaled.
 *
 * The grid has six tracks at its widest, and a card spans 2 (S), 3 (M) or 6 (L)
 * of them, so the frame is always at least as wide as the demo it was banded
 * for. When the page itself is narrow, say a phone, a card can still be
 * narrower than its demo; it then shows the entry (title, status, link) in place
 * of the demo rather than a smaller picture of it. The container-query classes
 * below have to be literal strings for Tailwind to generate them.
 *
 * The stage is a containing block for `position: fixed` (transform + paint
 * containment), so a toast stack or a dialog that pins itself to the viewport
 * stays inside its own card.
 */

const SPAN: Record<CardSize, string> = {
  S: "@min-[576px]/grid:col-span-3 @min-[896px]/grid:col-span-2",
  M: "@min-[576px]/grid:col-span-6 @min-[896px]/grid:col-span-3",
  L: "@min-[576px]/grid:col-span-6",
  entry: "@min-[576px]/grid:col-span-3 @min-[896px]/grid:col-span-2",
};

const MAX_H: Record<CardSize, string> = {
  S: "max-h-64",
  M: "max-h-96",
  L: "max-h-[34rem]",
  entry: "",
};

const SHOW_AT: Record<number, string> = {
  200: "@min-[200px]/card:flex",
  240: "@min-[240px]/card:flex",
  280: "@min-[280px]/card:flex",
  320: "@min-[320px]/card:flex",
  360: "@min-[360px]/card:flex",
  400: "@min-[400px]/card:flex",
  440: "@min-[440px]/card:flex",
  480: "@min-[480px]/card:flex",
  520: "@min-[520px]/card:flex",
  560: "@min-[560px]/card:flex",
  600: "@min-[600px]/card:flex",
  640: "@min-[640px]/card:flex",
  720: "@min-[720px]/card:flex",
  800: "@min-[800px]/card:flex",
  880: "@min-[880px]/card:flex",
};

const HIDE_AT: Record<number, string> = {
  200: "@min-[200px]/card:hidden",
  240: "@min-[240px]/card:hidden",
  280: "@min-[280px]/card:hidden",
  320: "@min-[320px]/card:hidden",
  360: "@min-[360px]/card:hidden",
  400: "@min-[400px]/card:hidden",
  440: "@min-[440px]/card:hidden",
  480: "@min-[480px]/card:hidden",
  520: "@min-[520px]/card:hidden",
  560: "@min-[560px]/card:hidden",
  600: "@min-[600px]/card:hidden",
  640: "@min-[640px]/card:hidden",
  720: "@min-[720px]/card:hidden",
  800: "@min-[800px]/card:hidden",
  880: "@min-[880px]/card:hidden",
};

function EntryNotice({ item, className }: { item: ShowcaseItem; className?: string }) {
  const why = item.blocked
    ? `${item.blocked.reason}, so it is not mounted in a list.`
    : item.natural
      ? "Too large to sit in a card at its real size."
      : "No measured size yet, so it is not mounted in a list.";
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-start justify-center gap-2 p-4 text-muted-foreground text-sm",
        className,
      )}
    >
      <p>{why}</p>
      <Link
        className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
        href={`/showcase/${item.id}`}
      >
        See it at full size
        <ArrowRight aria-hidden="true" size={14} />
      </Link>
    </div>
  );
}

export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const live = item.demo !== null && item.size !== "entry" && item.natural !== null;
  const step = item.natural ? widthStep(item.natural.w) : 280;

  return (
    <li
      className={cn(
        "@container/card flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card",
        SPAN[item.size],
      )}
      data-size={item.size}
      data-tier={item.tier}
    >
      {live && item.demo && item.natural ? (
        <>
          <div
            className={cn(
              "isolate hidden flex-1 transform-gpu items-center justify-center overflow-auto bg-background p-4 [contain:paint]",
              SHOW_AT[step],
              MAX_H[item.size],
            )}
          >
            {/* The width the demo was measured at, so a row of buttons keeps its labels
                and a field keeps its width, and the whole sits in the middle of the card. */}
            <div className="max-w-full" style={{ width: item.natural.w + 2 }}>
              <ShowcaseDemo id={item.demo} />
            </div>
          </div>
          <EntryNotice className={cn("flex-1 bg-background", HIDE_AT[step])} item={item} />
        </>
      ) : (
        <EntryNotice className="flex-1 bg-background" item={item} />
      )}
      <div className="flex flex-col gap-2 border-border border-t px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="min-w-0 truncate font-medium text-foreground text-sm underline-offset-4 hover:underline"
            href={`/showcase/${item.id}`}
          >
            {item.title}
          </Link>
          <StatusBadge status={item.status} />
        </div>
        <p className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>{item.category}</span>
          {item.variants > 1 ? <span className="tabular-nums">· {item.variants} demos</span> : null}
        </p>
        <GraduationSummary gaps={item.gaps} />
      </div>
    </li>
  );
}
