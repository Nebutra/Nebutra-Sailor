"use client";

import type { ReactNode } from "react";
import type { CodeSegment as CodeSegmentBase } from "./specimen-utils";

export type SpecimenTone = "neutral" | "info" | "success" | "warning" | "danger";
export type CodeSegment = CodeSegmentBase & {
  tone?: SpecimenTone;
  error?: boolean;
};

const TONE_RING: Record<SpecimenTone, string> = {
  neutral: "ring-[var(--neutral-6)]",
  info: "ring-info/45",
  success: "ring-success/50",
  warning: "ring-warning/50",
  danger: "ring-destructive/55",
};

const TONE_BG: Record<SpecimenTone, string> = {
  neutral: "bg-[var(--neutral-3)]",
  info: "bg-info/12",
  success: "bg-success/12",
  warning: "bg-warning/14",
  danger: "bg-destructive/12",
};

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type SegmentedCodeSpecimenProps = {
  title: string;
  subtitle?: string;
  segments: readonly CodeSegment[];
  statusTone?: SpecimenTone;
  statusLabel?: string;
  footer?: ReactNode;
  className?: string;
};

export function SegmentedCodeSpecimen({
  title,
  subtitle,
  segments,
  statusTone = "neutral",
  statusLabel,
  footer,
  className,
}: SegmentedCodeSpecimenProps) {
  return (
    <div
      className={cx("rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4 sm:p-5", className)}
      data-specimen="segmented-code"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--neutral-12)]">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--neutral-10)]">{subtitle}</p> : null}
        </div>
        {statusLabel ? (
          <span
            className={cx(
              "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              TONE_BG[statusTone],
              TONE_RING[statusTone],
              statusTone === "success" && "text-success-strong",
              statusTone === "danger" && "text-destructive-strong",
              statusTone === "warning" && "text-warning-strong",
              statusTone === "info" && "text-info",
              statusTone === "neutral" && "text-[var(--neutral-11)]",
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={title}>
        {segments.map((seg) => {
          const tone: SpecimenTone = seg.error ? "danger" : (seg.tone ?? "neutral");
          return (
            <li
              key={seg.id}
              className={cx(
                "min-w-[4.5rem] flex-1 rounded-[var(--radius-md)] px-2.5 py-2 ring-1 ring-inset",
                TONE_BG[tone],
                TONE_RING[tone],
              )}
            >
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--neutral-10)]">
                {seg.label}
              </p>
              <p
                className={cx(
                  "mt-1 break-all font-mono text-sm font-semibold tracking-wider",
                  seg.error ? "text-destructive-strong" : "text-[var(--neutral-12)]",
                )}
              >
                {seg.value || "—"}
              </p>
            </li>
          );
        })}
      </ul>
      {footer ? <div className="mt-3 text-xs text-[var(--neutral-10)]">{footer}</div> : null}
    </div>
  );
}
