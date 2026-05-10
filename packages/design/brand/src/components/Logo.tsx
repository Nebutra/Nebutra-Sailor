"use client";

export type LogoVariant =
  | "color"
  | "inverse"
  | "mono"
  | "en"
  | "zh"
  | "zh-en"
  | "horizontal-en"
  | "horizontal-zh"
  | "vertical-en"
  | "vertical-zh"
  | "horizontal-en-mono"
  | "horizontal-zh-mono"
  | "vertical-en-mono"
  | "vertical-zh-mono";

/**
 * Logo edition: classic (v1.0) or compliant (v2.0)
 *
 * - classic: 经典版，"毓"字更美观，用于用户体验场景 (App/网站/产品)
 * - compliant: 合规版，"毓"字符合商标规范，用于商务场景 (法律/商标/正式文件)
 */
export type LogoEdition = "classic" | "compliant";

/** Variants that only exist in the compliant edition */
const COMPLIANT_ONLY_VARIANTS: ReadonlySet<LogoVariant> = new Set([
  "horizontal-en-mono",
  "horizontal-zh-mono",
  "vertical-en-mono",
  "vertical-zh-mono",
]);

export interface LogoProps {
  /**
   * Logo variant
   * @default "en" (Nebutra with English wordmark)
   */
  variant?: LogoVariant;

  /**
   * Logo edition
   * - "classic" (default): v1.0 经典版，更美观
   * - "compliant": v2.0 合规版，符合商标规范
   *
   * Mono combination variants automatically use compliant edition.
   * @default "classic"
   */
  edition?: LogoEdition;

  /**
   * Logo size (width in pixels)
   * @default 120
   */
  size?: number;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Invert colors for dark backgrounds.
   * When true, black becomes white (useful for dark mode).
   *
   * Note: For pure white logomark, use variant="inverse" instead.
   */
  inverted?: boolean;
}

/**
 * Resolve the public path for a logo variant + edition combination.
 * Mono combination variants always route to the compliant directory.
 */
function getLogoPath(variant: LogoVariant, edition: LogoEdition): string {
  const dir =
    edition === "compliant" || COMPLIANT_ONLY_VARIANTS.has(variant) ? "/brand-compliant" : "/brand";
  return `${dir}/logo-${variant}.svg`;
}

/**
 * Aspect ratios for different logo variants
 * width:height ratio (e.g. 5.25 means width is 5.25x height)
 */
const ASPECT_RATIOS: Record<LogoVariant, number> = {
  color: 1.07, // 535.71 x 500 ≈ 1.07
  inverse: 1.07, // 535.71 x 500 ≈ 1.07
  mono: 1.07, // Same as color/inverse
  en: 5.25, // 544.21 x 103.74 ≈ 5.25 (horizontal text)
  zh: 3.5, // Estimated for Chinese wordmark
  "zh-en": 4.0, // Estimated for bilingual
  "horizontal-en": 5.25, // Similar to "en"
  "horizontal-zh": 4.5, // Estimated
  "vertical-en": 0.8, // Taller than wide
  "vertical-zh": 0.8, // Taller than wide
  "horizontal-en-mono": 5.25, // Same as horizontal-en
  "horizontal-zh-mono": 4.5, // Same as horizontal-zh
  "vertical-en-mono": 0.8, // Same as vertical-en
  "vertical-zh-mono": 0.8, // Same as vertical-zh
};

/**
 * Nebutra Logo Component
 *
 * Renders the official Nebutra brand logo from SVG assets.
 * Assets are synced to apps via `pnpm brand:sync`.
 *
 * @example
 * ```tsx
 * // Logomark only (square icon)
 * <Logo variant="inverse" size={40} />
 *
 * // Full logo with English wordmark
 * <Logo variant="en" size={150} />
 *
 * // Chinese wordmark
 * <Logo variant="zh" size={120} />
 * ```
 */
export function Logo({
  variant = "en",
  edition = "classic",
  size = 120,
  className,
  inverted = false,
}: LogoProps) {
  const aspectRatio = ASPECT_RATIOS[variant];
  const height = Math.round(size / aspectRatio);
  const src = getLogoPath(variant, edition);

  // For dark backgrounds, invert black to white
  const filterStyle = inverted ? { filter: "brightness(0) invert(1)" } : {};

  return (
    <img
      src={src}
      alt="Nebutra"
      width={size}
      height={height}
      className={className}
      style={{ width: size, height, ...filterStyle }}
    />
  );
}

/**
 * Logomark only (the abstract icon without text)
 *
 * This uses the "color" or "inverse" variant which is just the icon.
 *
 * @example
 * ```tsx
 * <Logomark variant="inverse" size={32} />
 * ```
 */
export function Logomark({
  size = 32,
  className,
  variant = "color",
  edition = "classic",
  inverted = false,
}: {
  size?: number;
  className?: string;
  variant?: "color" | "inverse" | "mono";
  edition?: LogoEdition;
  inverted?: boolean;
}) {
  const src = getLogoPath(variant, edition);

  // For dark backgrounds, invert black to white (unless using "inverse" variant which is already white)
  const filterStyle =
    inverted && variant !== "inverse" ? { filter: "brightness(0) invert(1)" } : {};

  return (
    <img
      src={src}
      alt="Nebutra"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, ...filterStyle }}
    />
  );
}

/**
 * Wordmark only (text "Nebutra" without the icon)
 *
 * Uses the "en" variant which has the full wordmark.
 * For icon + text, use Logo with variant="en".
 */
export function Wordmark({
  size = 100,
  className,
  variant = "en",
  edition = "classic",
  inverted = false,
}: {
  size?: number;
  className?: string;
  variant?: "en" | "zh" | "zh-en";
  edition?: LogoEdition;
  inverted?: boolean;
}) {
  const aspectRatio = ASPECT_RATIOS[variant];
  const height = Math.round(size / aspectRatio);
  const src = getLogoPath(variant, edition);

  const filterStyle = inverted ? { filter: "brightness(0) invert(1)" } : {};

  return (
    <img
      src={src}
      alt="Nebutra"
      width={size}
      height={height}
      className={className}
      style={{ width: size, height, ...filterStyle }}
    />
  );
}

export default Logo;
