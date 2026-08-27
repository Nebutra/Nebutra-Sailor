"use client";

import type { ReactNode } from "react";

export type JwtPart = {
  label: string;
  raw: string;
  pretty?: string;
  tone: "header" | "payload" | "signature";
};

export type JwtTokenSpecimenProps = {
  parts: readonly JwtPart[];
  claimsSummary?: ReactNode;
  note?: string;
  className?: string;
};

const PART_BG: Record<JwtPart["tone"], string> = {
  header: "bg-[color-mix(in_srgb,hsl(var(--primary))_14%,var(--neutral-3))]",
  payload: "bg-[color-mix(in_srgb,var(--status-success)_14%,var(--neutral-3))]",
  signature: "bg-[color-mix(in_srgb,var(--status-warning)_16%,var(--neutral-3))]",
};

const PART_DOT: Record<JwtPart["tone"], string> = {
  header: "bg-[hsl(var(--primary))]",
  payload: "bg-[var(--status-success)]",
  signature: "bg-[var(--status-warning)]",
};

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function JwtTokenSpecimen({ parts, claimsSummary, note, className }: JwtTokenSpecimenProps) {
  return (
    <div className={cx("space-y-3", className)} data-specimen="jwt-token">
      <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[0.7rem] leading-relaxed sm:text-xs">
        {parts.map((part, i) => (
          <span key={part.tone} className="inline-flex max-w-full items-center gap-1">
            {i > 0 ? <span className="text-[var(--neutral-9)]">.</span> : null}
            <span
              className={cx(
                "inline-block max-w-[12rem] truncate rounded px-1.5 py-0.5 sm:max-w-[16rem]",
                PART_BG[part.tone],
              )}
              title={part.raw}
            >
              {part.raw || "—"}
            </span>
          </span>
        ))}
      </div>
      {claimsSummary}
      <div className="grid gap-3 md:grid-cols-3">
        {parts.map((part) => (
          <section
            key={part.tone}
            className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3"
            aria-label={part.label}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={cx("h-2 w-2 rounded-full", PART_DOT[part.tone])} aria-hidden />
              <p className="text-xs font-semibold text-[var(--neutral-12)]">{part.label}</p>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[0.7rem] leading-relaxed text-[var(--neutral-11)]">
              {part.pretty ?? (part.raw || "—")}
            </pre>
          </section>
        ))}
      </div>
      {note ? <p className="text-xs text-[var(--neutral-10)]">{note}</p> : null}
    </div>
  );
}
