"use client";

import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type Size = "sm" | "md" | "lg" | "xl";
type Variant = "gradient" | "soft" | "outline";

export interface BrandMarkProps {
  /** Optional icon or glyph rendered inside the mark. Defaults to an abstract dot. */
  children?: ReactNode;
  /** Visual variant — solid gradient, soft tinted, or outline. */
  variant?: Variant;
  /** Diameter preset. */
  size?: Size;
  /** Extra classes for the outer element. */
  className?: string;
  /** Whether to render a soft halo behind the mark. */
  halo?: boolean;
  /** Make the mark non-interactive for screen readers. */
  ariaHidden?: boolean;
}

const SIZE_MAP: Record<Size, { box: string; halo: string; glyph: string }> = {
  sm: { box: "h-8 w-8", halo: "h-16 w-16 -inset-4", glyph: "h-3.5 w-3.5" },
  md: { box: "h-10 w-10", halo: "h-20 w-20 -inset-5", glyph: "h-4 w-4" },
  lg: { box: "h-14 w-14", halo: "h-28 w-28 -inset-7", glyph: "h-5 w-5" },
  xl: { box: "h-20 w-20", halo: "h-40 w-40 -inset-10", glyph: "h-7 w-7" },
};

/**
 * BrandMark — small branded visual primitive (AI badge / empty-state anchor).
 *
 * Binds **roles.brand** via `--brand-mark` / `--brand-mark-foreground`, never
 * product CTA (`--primary` / roles.action). Skins and Brand Package override
 * `--brand-mark` independently of buttons.
 *
 * Full VI lockups use `@nebutra/brand` Logo / LogomarkSVG (currentColor →
 * `text-brand-mark` or VI assets).
 *
 * @example
 * ```tsx
 * <BrandMark size="lg" halo>
 *   <Sparkles className="h-5 w-5" />
 * </BrandMark>
 * ```
 */
export function BrandMark({
  children,
  variant = "gradient",
  size = "md",
  className,
  halo = false,
  ariaHidden = true,
}: BrandMarkProps) {
  const sizes = SIZE_MAP[size];

  return (
    <span
      aria-hidden={ariaHidden}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
    >
      {halo && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute rounded-full bg-brand-mark opacity-30 blur-2xl",
            sizes.halo,
          )}
        />
      )}

      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-[var(--radius-2xl)]",
          sizes.box,
          variant === "gradient" && "bg-brand-mark text-brand-mark-foreground shadow-sm",
          variant === "soft" && "bg-brand-mark/10 text-brand-mark dark:bg-brand-mark/20",
          variant === "outline" && "border border-border bg-background text-foreground",
        )}
      >
        {children ?? <DefaultGlyph className={sizes.glyph} />}
      </span>
    </span>
  );
}

function DefaultGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.35" />
    </svg>
  );
}
