/**
 * Router product sub-brand mark — raster asset (no hand-written SVG).
 * Source: apps/router/public/product/router-repeater.png (committed, not brand:sync).
 */
import { cn } from "@nebutra/ui/utils";

export function RouterMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      {/* biome-ignore lint/performance/noImgElement: product mark from public/product */}
      <img
        src="/product/router-repeater.png"
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
