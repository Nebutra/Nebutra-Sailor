/**
 * Web product chrome brand assets.
 * Default mark/wordmark: inline SVG from `@nebutra/brand` (no public/brand sync).
 * Tenant logos still use remote Image URLs.
 */

import { LogoEnSVG, LogomarkSVG } from "@nebutra/brand";
import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

/** @deprecated Prefer inline SVG BrandLogo; kept for callers reading asset metadata. */
export const webBrandAssets = {
  source: "@nebutra/brand/LogoSVG",
  mark: {
    src: "inline:LogomarkSVG",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "inline:LogoEnSVG",
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

  // Inline SVG: fill=currentColor + text-brand-mark. Dark surfaces use
  // text-white via parent chrome; no separate inverse asset file required.
  const tone = colorScheme === "light" ? "text-brand-mark" : "text-brand-mark dark:text-white";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", tone, className)}
      data-brand-asset={variant}
      data-brand-source={webBrandAssets.source}
    >
      {variant === "mark" ? (
        <LogomarkSVG className={cn("block h-full w-full", imgClassName)} width={32} height={32} />
      ) : (
        <LogoEnSVG className={cn("block h-full w-auto max-w-full", imgClassName)} width={140} />
      )}
    </span>
  );
}
