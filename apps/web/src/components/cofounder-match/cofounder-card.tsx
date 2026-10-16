"use client";

import { Compass, Layers, ShieldCheck, Sparkles } from "@nebutra/icons";
import { useTranslations } from "next-intl";

/**
 * The Match-Your-Cofounder card — a founder × company, not a face.
 *
 * Rendered from a REAL compiled CompanyContext (no fabricated profiles). In
 * "preview" mode it shows the current founder how their own company appears to
 * cofounders; in Discover mode the same card carries Pass/Interested/Pitch.
 *
 * Drawn as one lit card on the shadow ramp (hairline, glass-sm): quiet hairline
 * chips for archetype and trust, the company in display weight, and the
 * complementarity reading as a ruled row — not a filled ink band with
 * uppercase micro labels.
 */
export interface CofounderCardData {
  readonly companyName: string;
  readonly arena: string;
  readonly oneLiner: string;
  readonly category?: string;
  /** Founder archetype (Technical / GTM / …) — computed when the founder joins the pool. */
  readonly archetype?: string;
  /** e.g. "3 artifacts compiled" — real traction from Startup OS. */
  readonly tractionLabel?: string;
  /** Complementarity vs the viewer — computed by the cofounder-match engine (Discover only). */
  readonly complementarity?: string;
  /** True when the founder has a compiled company (a real trust signal). */
  readonly trustVerified?: boolean;
}

const CARD_FRAME =
  "flex min-h-[340px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-glass-sm";

export function CofounderCard({
  data,
  preview = false,
}: {
  data: CofounderCardData;
  preview?: boolean;
}) {
  const tc = useTranslations("copy.cofounderMatchCofounderCard");
  return (
    <div className={CARD_FRAME}>
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-neutral-11">
          <Compass className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {data.archetype ?? tc("founder")}
        </span>
        {data.trustVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-neutral-11">
            <ShieldCheck className="size-3.5 text-success-strong" aria-hidden="true" />
            {tc("compiledCompany")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-5">
        <div>
          <h3 className="truncate text-xl tracking-tight text-neutral-12">{data.companyName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.arena}
            {data.category ? ` · ${data.category}` : ""}
          </p>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-neutral-11">{data.oneLiner}</p>

        {/* Complementarity — engine-computed; honest placeholder in preview */}
        <div className="mt-1 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-11">
            <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {tc("complementarity")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {data.complementarity ?? (preview ? tc("computedAgainstEachViewer") : "—")}
          </p>
        </div>

        {data.tractionLabel ? (
          <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            <Layers className="size-3.5 text-neutral-9" aria-hidden="true" />
            {data.tractionLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The card's shape before a company exists — the same frame and rhythm in
 * faint fills, for the empty state's product glimpse. Decorative.
 */
export function CofounderCardGhost({ className }: { className?: string } = {}) {
  return (
    <div aria-hidden="true" className={`${CARD_FRAME} mx-auto ${className ?? ""}`}>
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="h-6 w-20 rounded-full border border-border" />
        <span className="h-6 w-28 rounded-full border border-border" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-5">
        <span className="h-4 w-40 rounded-full bg-foreground/[0.10]" />
        <span className="h-2 w-24 rounded-full bg-foreground/[0.07]" />
        <div className="mt-2 space-y-2">
          <span className="block h-2 w-full rounded-full bg-foreground/[0.06]" />
          <span className="block h-2 w-11/12 rounded-full bg-foreground/[0.06]" />
          <span className="block h-2 w-3/5 rounded-full bg-foreground/[0.06]" />
        </div>
        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <span className="block h-2 w-28 rounded-full bg-foreground/[0.08]" />
          <span className="block h-1.5 w-full rounded-full bg-foreground/[0.05]" />
        </div>
      </div>
    </div>
  );
}

/**
 * The Discover deck at rest: the ghost card on top of two more, on a sunken
 * canvas — what an empty cofounder page shows instead of an icon.
 */
export function CofounderDeckGlimpse() {
  return (
    <div className="relative isolate flex justify-center rounded-xl border border-border bg-neutral-2 px-6 pt-10 pb-6">
      <div className="absolute inset-x-12 top-4 -z-20 h-40 rounded-2xl border border-border bg-card/60" />
      <div className="absolute inset-x-8 top-7 -z-10 h-40 rounded-2xl border border-border bg-card/80 shadow-xs" />
      <CofounderCardGhost className="min-h-[280px]" />
    </div>
  );
}
