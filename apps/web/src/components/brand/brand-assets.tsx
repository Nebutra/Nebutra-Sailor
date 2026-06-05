import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

export const webBrandAssets = {
  source: "packages/design/brand",
  mark: {
    src: "/brand/logo-color.svg",
    // logo-inverse is the brand-compliant white-mark for dark backgrounds —
    // already white, no CSS filter required.
    srcDark: "/brand/logo-inverse.svg",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "/brand/logo-horizontal-en.svg",
    // Brand-compliant mono variant — dark glyphs only, paired with invert()
    // in dark mode so it reads as white on dark.
    srcDarkMono: "/brand-compliant/logo-horizontal-en-mono.svg",
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
  imgClassName?: string;
  variant?: "horizontal" | "mark";
}

export function BrandLogo({ className, imgClassName, variant = "horizontal" }: BrandLogoProps) {
  const asset = webBrandAssets[variant];
  // Pick the brand-compliant dark variant: either an already-white asset
  // (srcDark, no filter) or a dark-mono asset that needs invert() to flip
  // to white. mono in, mono out — no hue manipulation on the color SVG.
  const darkSrc = "srcDark" in asset ? asset.srcDark : null;
  const darkMonoSrc = "srcDarkMono" in asset ? asset.srcDarkMono : null;
  const darkVariantSrc = darkSrc ?? darkMonoSrc;
  const needsInvert = !darkSrc && Boolean(darkMonoSrc);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      data-brand-asset={variant}
      data-brand-source={webBrandAssets.source}
    >
      <Image
        src={asset.src}
        alt=""
        width={asset.width}
        height={asset.height}
        unoptimized
        aria-hidden="true"
        draggable={false}
        className={cn(
          "block h-full w-full object-contain",
          darkVariantSrc && "dark:hidden",
          imgClassName,
        )}
      />
      {darkVariantSrc ? (
        <Image
          src={darkVariantSrc}
          alt=""
          width={asset.width}
          height={asset.height}
          unoptimized
          aria-hidden="true"
          draggable={false}
          className={cn(
            "hidden h-full w-full object-contain dark:block",
            needsInvert && "invert",
            imgClassName,
          )}
        />
      ) : null}
    </span>
  );
}
