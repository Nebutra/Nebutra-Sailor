/**
 * Brand OG image template — props-driven, hex/rgba values only.
 *
 * IMPORTANT: Satori (used by next/og's ImageResponse) does NOT resolve
 * CSS custom properties (`var(--brand-primary)` etc.). All colors must be
 * passed as explicit hex or rgba values. The `colors` export from
 * `@nebutra/brand/metadata` is the authoritative source — callers must
 * import from there and pass the values as props. Do NOT add CSS vars here.
 *
 * Wordmark letterform GEOMETRY cannot be auto-generated from a name string.
 * The component renders the brand name as text; operators who need precise
 * wordmark letterforms must supply replacement SVGs via brand.config/assets/logo/.
 */

import { colors } from "../metadata";
// ─── Types ────────────────────────────────────────────────────────────────────

export interface OgThemePalette {
  /** Background fill — must be explicit hex/rgba, not a CSS var */
  bg: string;
  /** Grid/rule color — rgba for transparency */
  grid: string;
  /** Primary glow color — rgba for transparency */
  glowA: string;
  /** Secondary glow color — rgba for transparency */
  glowB: string;
  /** Heading text color */
  title: string;
  /** Body/label text color — rgba for partial opacity */
  subtitle: string;
  /** Brand accent color — explicit hex */
  accent: string;
}

export interface OgTemplateProps {
  /** Page or post title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Brand name to display in the eyebrow (from brand.name — no literal) */
  brandName: string;
  /** Theme palette with explicit hex/rgba values — no CSS vars */
  palette: OgThemePalette;
}

// ─── Default palettes (using brand color values, NOT var()) ──────────────────

/** `#rrggbb` at an alpha, as rgba() — satori cannot resolve var() or color-mix(). */
function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * Dark-theme palette, read from the brand colours (brand:apply's output).
 * The comments here used to name the source while the values had drifted
 * from it — bg was pre-House Slate while claiming to be neutral-950.
 */
export const OG_PALETTE_DARK: OgThemePalette = {
  bg: colors.neutral["950"],
  grid: "rgba(255,255,255,0.04)",
  glowA: withAlpha(colors.primary["500"], 0.28),
  glowB: withAlpha(colors.accent["500"], 0.22),
  title: colors.white,
  subtitle: "rgba(255,255,255,0.72)",
  accent: colors.accent["500"],
};

/**
 * Light-theme palette.
 */
export const OG_PALETTE_LIGHT: OgThemePalette = {
  bg: colors.white,
  grid: "rgba(0,0,0,0.05)",
  glowA: withAlpha(colors.primary["500"], 0.22),
  glowB: withAlpha(colors.accent["500"], 0.2),
  title: colors.neutral["950"],
  subtitle: withAlpha(colors.neutral["950"], 0.66),
  accent: colors.primary["500"],
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * OG image template for use with Satori / next/og ImageResponse.
 *
 * @example
 * ```tsx
 * import { colors, brand } from "@nebutra/brand/metadata";
 * import { OgTemplate, OG_PALETTE_DARK } from "@nebutra/brand/og";
 * import { ImageResponse } from "next/og";
 *
 * return new ImageResponse(
 *   <OgTemplate
 *     title="My Page"
 *     brandName={brand.name}
 *     palette={OG_PALETTE_DARK}
 *   />,
 *   { width: 1200, height: 630 }
 * );
 * ```
 */
export function OgTemplate({ title, subtitle, brandName, palette }: OgTemplateProps) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "80px",
        backgroundColor: palette.bg,
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 42%, ${palette.glowA} 0%, transparent 72%), radial-gradient(ellipse 60% 40% at 72% 70%, ${palette.glowB} 0%, transparent 75%)`,
      }}
    >
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          display: "flex",
        }}
      />

      {/* Brand eyebrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          color: palette.accent,
          fontSize: "28px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {brandName}
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          color: palette.title,
          fontSize: "78px",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginTop: "24px",
          maxWidth: "1040px",
        }}
      >
        {title}
      </div>

      {/* Optional subtitle */}
      {subtitle ? (
        <div
          style={{
            display: "flex",
            color: palette.subtitle,
            fontSize: "32px",
            fontWeight: 400,
            lineHeight: 1.35,
            marginTop: "20px",
            maxWidth: "1040px",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
