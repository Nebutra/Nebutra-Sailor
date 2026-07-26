/**
 * Product chrome brand mark — **no public/brand dependency**.
 *
 * Renders inline SVG from `@nebutra/brand` (LogomarkSVG / LogoEnSVG).
 * Assets are path data in the package, shipped with the JS bundle — works even
 * when gitignored `public/brand` is missing or `brand:sync` is skipped by CI.
 */

import { LogoEnSVG, LogomarkSVG } from "@nebutra/brand";

export function BrandLogo({
  variant = "horizontal",
  className,
}: {
  variant?: "horizontal" | "mark";
  className?: string;
}) {
  return (
    <span
      className={["inline-flex shrink-0 items-center", className].filter(Boolean).join(" ")}
      data-brand-asset={variant}
      data-brand-source="@nebutra/brand/LogoSVG"
    >
      {variant === "mark" ? (
        <LogomarkSVG className="block h-full w-full" width={32} height={32} />
      ) : (
        <LogoEnSVG className="block h-full w-auto max-w-full" width={140} />
      )}
    </span>
  );
}
