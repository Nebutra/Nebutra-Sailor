/**
 * Cross-product Router mark for Forge chrome (raster, no hand SVG).
 * Seed: apps/forge/public/product/router-repeater.png. Browser src is CDN.
 */
import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import { cn } from "@nebutra/ui/utils";

export function RouterMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src={publicAssetUrl("forge/product/router-repeater.png")}
        alt=""
        width={256}
        height={256}
        draggable={false}
        aria-hidden
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
