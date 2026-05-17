import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

export const webBrandAssets = {
  source: "packages/design/brand",
  mark: {
    src: "/brand/logo-color.svg",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "/brand/logo-horizontal-en.svg",
    width: 1062,
    height: 208,
  },
} as const;

export const webBrandLabels = {
  homeLink: "Open product home",
  primaryNavigation: "Primary navigation",
} as const;

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  variant?: "horizontal" | "mark";
}

export function BrandLogo({ className, imgClassName, variant = "horizontal" }: BrandLogoProps) {
  const asset = webBrandAssets[variant];

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
        className={cn("block h-full w-full object-contain", imgClassName)}
      />
    </span>
  );
}
