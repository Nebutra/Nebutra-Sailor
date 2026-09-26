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
    return "from-[color-mix(in_srgb,hsl(var(--primary))_35%,var(--neutral-3))] to-neutral-3";
  }
  if (b.includes("master")) {
    return "from-warning/28 to-neutral-3";
  }
  if (b.includes("amex") || b.includes("american")) {
    return "from-info/30 to-neutral-3";
  }
  if (b.includes("union") || b.includes("银联")) {
    return "from-destructive/22 to-neutral-3";
  }
  return "from-neutral-3 to-neutral-2";
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
          "ring-1 ring-inset ring-neutral-6",
          brandSurface(displayBrand),
        )}
        style={{ aspectRatio: "1.586 / 1", maxWidth: "22rem" }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-neutral-11">
            {displayBrand}
          </span>
          {statusLabel ? (
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                valid === true && "bg-success/18 text-success-strong",
                valid === false && "bg-destructive/18 text-destructive-strong",
                valid == null && "bg-neutral-1 text-neutral-11",
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-8 font-mono text-lg font-semibold tracking-[0.18em] text-neutral-12 sm:text-xl">
          {numberDisplay || "···· ···· ···· ····"}
        </p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-neutral-10">{specimenLabel}</p>
            <p className="text-xs text-neutral-11">{structureLabel}</p>
          </div>
          <div
            className="h-8 w-10 rounded-md bg-[color-mix(in_srgb,var(--neutral-12)_12%,transparent)]"
            aria-hidden
          />
        </div>
      </section>
      {caveat ? <p className="max-w-sm text-xs text-neutral-10">{caveat}</p> : null}
      {footer}
    </div>
  );
}
