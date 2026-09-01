/**
 * Cross-product Forge mark for Router chrome (raster, no hand SVG).
 * Seed: apps/router/public/product/forge-anvil.png. Browser src is CDN.
 */
import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import { cn } from "@nebutra/ui/utils";

export function ForgeMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src={publicAssetUrl("router/product/forge-anvil.png")}
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
