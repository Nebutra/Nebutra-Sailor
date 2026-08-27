// @brand-exempt: the downloadable brand kit; the alt text names the mark being offered, which is the subject of the page rather than chrome on it
/**
 * Web product chrome brand assets.
 *
 * VI rule (productChromeLogoRule):
 * - Light mark: multi-path color asset (`logo-color.svg`) — never mono + solid brand-mark blue
 * - Dark mark: mono LogomarkSVG white
 * - Wordmark: independent WordmarkEnSVG (currentColor), decoupled from mark fills
 */

import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import logoColorMark from "@nebutra/brand/assets/logo/logo-color.svg";
import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

const logoColorMarkSrc =
  typeof logoColorMark === "string" ? logoColorMark : (logoColorMark as { src: string }).src;

/** @deprecated Prefer BrandLogo; kept for callers reading asset metadata. */
export const webBrandAssets = {
  source: "@nebutra/brand",
  mark: {
    src: "logo-color.svg + LogomarkSVG",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "logo-color + WordmarkEnSVG",
    width: 1062,
    height: 208,
  },
} as const;

export const webBrandLabels = {
  homeLink: "Open product home",
  primaryNavigation: "Primary navigation",
  collapseSidebar: "Collapse sidebar",
  expandSidebar: "Expand sidebar",
} as const;

interface BrandLogoProps {
  className?: string;
  /** Force light (color mark). Default auto uses theme (data-theme / .dark). */
  colorScheme?: "auto" | "light";
  imgClassName?: string;
  variant?: "horizontal" | "mark";
  /**
   * Tenant-uploaded logo URL. When provided and non-null, the tenant image
   * is rendered instead of the static brand asset.
   */
  tenantLogoUrl?: string | null;
}

export function BrandLogo({
  className,
  colorScheme = "auto",
  imgClassName,
  variant = "horizontal",
  tenantLogoUrl,
}: BrandLogoProps) {
  if (tenantLogoUrl) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center", className)}
        data-brand-asset="tenant"
      >
        <Image
          src={tenantLogoUrl}
          alt=""
          width={200}
          height={200}
          unoptimized
          aria-hidden="true"
          draggable={false}
          className={cn("block h-full w-full object-contain", imgClassName)}
        />
      </span>
    );
  }

  const forceLight = colorScheme === "light";

  // Mark: multi-path VI color on light; mono white on dark
  const colorMarkClass = cn(
    "h-full w-auto shrink-0 object-contain",
    !forceLight && "dark:hidden",
    imgClassName,
  );
  const monoMarkClass = cn(
    "h-full w-auto shrink-0 !text-white",
    forceLight ? "hidden" : "hidden dark:block",
    imgClassName,
  );

  if (variant === "mark") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        data-brand-asset="mark"
        data-brand-source={webBrandAssets.source}
      >
        <Image
          src={logoColorMarkSrc}
          alt=""
          width={28}
          height={26}
          unoptimized
          aria-hidden
          draggable={false}
          className={colorMarkClass}
        />
        <LogomarkSVG width={28} height={26} className={monoMarkClass} aria-label="Nebutra" />
      </span>
    );
  }

  // Horizontal: color mark + independent wordmark (not mono solid blue composite)
  return (
    <span
      className={cn("inline-flex h-full min-h-[1.25rem] shrink-0 items-center gap-2", className)}
      data-brand-asset="horizontal"
      data-brand-source={webBrandAssets.source}
    >
      <Image
        src={logoColorMarkSrc}
        alt=""
        width={26}
        height={24}
        unoptimized
        aria-hidden
        draggable={false}
        className={cn("h-[1.35em] w-auto", !forceLight && "dark:hidden", imgClassName)}
      />
      <LogomarkSVG
        width={24}
        height={24}
        className={cn(
          "h-[1.35em] w-auto shrink-0 !text-white",
          forceLight ? "hidden" : "hidden dark:block",
          imgClassName,
        )}
        aria-label="Nebutra"
      />
      <WordmarkEnSVG
        width={100}
        height={18}
        className={cn(
          "h-[0.95em] w-auto !text-[var(--neutral-12)]",
          !forceLight && "dark:!text-white",
          imgClassName,
        )}
      />
    </span>
  );
}
