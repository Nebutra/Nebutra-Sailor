"use client";

import type { ReactNode } from "react";

export type BankCardSpecimenProps = {
  brand: string;
  numberDisplay: string;
  valid?: boolean;
  statusLabel?: string;
  specimenLabel: string;
  structureLabel: string;
  fallbackBrand?: string;
  caveat?: string;
  footer?: ReactNode;
  className?: string;
};

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function brandSurface(brand: string): string {
  const b = brand.toLowerCase();
  if (b.includes("visa")) {
    return "from-[color-mix(in_srgb,hsl(var(--primary))_35%,var(--neutral-3))] to-[var(--neutral-3)]";
  }
  if (b.includes("master")) {
    return "from-[color-mix(in_srgb,var(--status-warning)_28%,var(--neutral-3))] to-[var(--neutral-3)]";
  }
  if (b.includes("amex") || b.includes("american")) {
    return "from-[color-mix(in_srgb,var(--status-info)_30%,var(--neutral-3))] to-[var(--neutral-3)]";
  }
  if (b.includes("union") || b.includes("银联")) {
    return "from-[color-mix(in_srgb,var(--status-danger)_22%,var(--neutral-3))] to-[var(--neutral-3)]";
  }
  return "from-[var(--neutral-3)] to-[var(--neutral-2)]";
}

export function BankCardSpecimen({
  brand,
  numberDisplay,
  valid,
  statusLabel,
  specimenLabel,
  structureLabel,
  fallbackBrand = "Card",
  caveat,
  footer,
  className,
}: BankCardSpecimenProps) {
  const displayBrand = brand || fallbackBrand;
  const aria = [displayBrand, statusLabel].filter(Boolean).join(": ");
  return (
    <div className={cx("space-y-3", className)} data-specimen="bank-card">
      <section
        aria-label={aria || displayBrand}
        className={cx(
          "relative overflow-hidden rounded-[1.1rem] bg-gradient-to-br p-5 shadow-ambient-sm",
          "ring-1 ring-inset ring-[var(--neutral-6)]",
          brandSurface(displayBrand),
        )}
        style={{ aspectRatio: "1.586 / 1", maxWidth: "22rem" }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--neutral-11)]">
            {displayBrand}
          </span>
          {statusLabel ? (
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                valid === true &&
                  "bg-[color-mix(in_srgb,var(--status-success)_18%,transparent)] text-[var(--status-success)]",
                valid === false &&
                  "bg-[color-mix(in_srgb,var(--status-danger)_18%,transparent)] text-[var(--status-danger)]",
                valid == null && "bg-[var(--neutral-1)] text-[var(--neutral-11)]",
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-8 font-mono text-lg font-semibold tracking-[0.18em] text-[var(--neutral-12)] sm:text-xl">
          {numberDisplay || "···· ···· ···· ····"}
        </p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-[var(--neutral-10)]">
              {specimenLabel}
            </p>
            <p className="text-xs text-[var(--neutral-11)]">{structureLabel}</p>
          </div>
          <div
            className="h-8 w-10 rounded-md bg-[color-mix(in_srgb,var(--neutral-12)_12%,transparent)]"
            aria-hidden
          />
        </div>
      </section>
      {caveat ? <p className="max-w-sm text-xs text-[var(--neutral-10)]">{caveat}</p> : null}
      {footer}
    </div>
  );
}
