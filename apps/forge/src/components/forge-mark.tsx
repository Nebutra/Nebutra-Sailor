/**
 * Forge product sub-brand mark — raster asset (no hand-written SVG).
 * Source: apps/forge/public/product/forge-anvil.png (committed, not brand:sync).
 */
import { cn } from "@nebutra/ui/utils";

export function ForgeMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src="/product/forge-anvil.png"
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
