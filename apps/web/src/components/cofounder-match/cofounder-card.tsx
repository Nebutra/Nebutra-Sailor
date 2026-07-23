"use client";

import { Compass, Layers, ShieldCheck, Sparkles } from "@nebutra/icons";

/**
 * The Match-Your-Cofounder card — a founder × company, not a face.
 *
 * Rendered from a REAL compiled CompanyContext (no fabricated profiles). In
 * "preview" mode it shows the current founder how their own company appears to
 * cofounders; in Discover mode (later) the same card carries Pass/Interested/Pitch.
 */
export interface CofounderCardData {
  readonly companyName: string;
  readonly arena: string;
  readonly oneLiner: string;
  readonly category?: string;
  /** Founder archetype (Technical / GTM / …) — computed when the founder joins the pool. */
  readonly archetype?: string;
  /** e.g. "3 artifacts shipped" — real traction from Startup OS. */
  readonly tractionLabel?: string;
  /** Complementarity vs the viewer — computed by the cofounder-match engine (Discover only). */
  readonly complementarity?: string;
  /** True when the founder has a compiled company (a real trust signal). */
  readonly trustVerified?: boolean;
}

export function CofounderCard({
  data,
  preview = false,
}: {
  data: CofounderCardData;
  preview?: boolean;
}) {
  return (
    <div className="flex min-h-[380px] w-full max-w-sm flex-col overflow-hidden rounded-[28px] border border-neutral-7 bg-neutral-1 shadow-lg shadow-neutral-12/5">
      {/* Brand-tinted header band */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "hsl(var(--primary))" }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-1/85 px-2.5 py-1 text-[11px] font-semibold text-neutral-11 backdrop-blur">
          <Compass className="size-3.5 text-blue-9" aria-hidden="true" />
          {data.archetype ?? "Founder"}
        </span>
        {data.trustVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-1/85 px-2.5 py-1 text-[11px] font-semibold text-green-10 backdrop-blur">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Compiled company
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div>
          <h3 className="truncate text-lg font-semibold text-neutral-12">{data.companyName}</h3>
          <p className="mt-0.5 text-xs font-medium text-neutral-10">
            {data.arena}
            {data.category ? ` · ${data.category}` : ""}
          </p>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-neutral-11">{data.oneLiner}</p>

        {/* Complementarity — engine-computed; honest placeholder in preview */}
        <div className="rounded-xl border border-neutral-6 bg-neutral-2 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-9">
            <Sparkles className="size-3.5 text-blue-9" aria-hidden="true" />
            Complementarity
          </div>
          <p className="mt-1 text-xs text-neutral-10">
            {data.complementarity ??
              (preview ? "Computed against each viewer once you join the cofounder pool." : "—")}
          </p>
        </div>

        {data.tractionLabel ? (
          <div className="mt-auto flex items-center gap-1.5 text-xs text-neutral-10">
            <Layers className="size-3.5 text-neutral-9" aria-hidden="true" />
            {data.tractionLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
