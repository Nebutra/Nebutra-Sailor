import { brand } from "../metadata";
import { Logomark, logoPublicSrc, Wordmark } from "./Logo";
import { LogomarkSVG, WordmarkEnSVG } from "./LogoSVG";

/**
 * Theme-aware brand mark for product chrome — one component instead of the
 * hand-rolled light/dark pairs in each app.
 *
 * The VI colour mark (`logo-color.svg`) has fixed fills that only read on a
 * light surface. On a dark surface (`.dark` ancestor) the mono mark renders
 * white instead. A brand with no logo files yet (`brand.logo === "wordmark"`,
 * what `brand:init` sets for a fresh project) shows its initial, which follows
 * currentColor in both themes.
 *
 * Framework-agnostic (plain `<img>`), so it works in Vite and Next alike.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  if (brand.logo === "wordmark") return <Logomark size={size} className={className} />;
  return (
    <span
      className={["inline-flex shrink-0", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      data-brand-asset="mark"
    >
      <img
        src={logoPublicSrc("color", "classic")}
        alt=""
        aria-hidden
        width={size}
        height={size}
        draggable={false}
        className="block h-full w-full dark:hidden"
      />
      <LogomarkSVG
        width={size}
        height={size}
        // allow-palette: brand logomark VI asset — mono white on dark is fixed identity, not themed ink
        className="hidden h-full w-full !text-white dark:block"
      />
    </span>
  );
}

/**
 * The brand name as the wordmark asset, never as typed text: the SVG wordmark
 * in currentColor (so it follows the surrounding ink in both themes), or the
 * text wordmark for a brand that has no logo files yet.
 *
 * `inline`: sized by the surrounding text instead of `height`, for a wordmark
 * set inside a headline. The SVG sits at cap height (0.74em) on the baseline;
 * the text wordmark takes the heading's own face, size and weight, so the
 * name reads as part of the sentence at any breakpoint.
 */
export function BrandWordmark({
  height = 24,
  className,
  inline = false,
}: {
  height?: number;
  className?: string;
  inline?: boolean;
}) {
  const width = Math.round((height * 544.21) / 103.74);
  if (brand.logo === "wordmark") {
    if (inline) return <span className={className}>{brand.name}</span>;
    return <Wordmark size={width} className={className} />;
  }
  return (
    <WordmarkEnSVG
      width={width}
      height={height}
      aria-label={brand.name}
      className={["inline-block shrink-0", className].filter(Boolean).join(" ")}
      style={inline ? { height: "0.74em", width: "auto", verticalAlign: "baseline" } : undefined}
    />
  );
}
