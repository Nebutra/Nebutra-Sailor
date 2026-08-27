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

/**
 * Dark-theme palette.
 * Colors are sourced from @nebutra/brand/metadata colors object — callers
 * may import from there to keep them in sync with brand:apply changes.
 */
export const OG_PALETTE_DARK: OgThemePalette = {
  bg: "#020617", // colors.neutral["950"]
  grid: "rgba(255,255,255,0.04)",
  glowA: "rgba(0,51,254,0.28)", // colors.primary["500"] at 28% opacity
  glowB: "rgba(11,241,195,0.22)", // colors.accent["500"] at 22% opacity
  title: "#ffffff",
  subtitle: "rgba(255,255,255,0.72)",
  accent: "#0bf1c3", // colors.accent["500"]
};

/**
 * Light-theme palette.
 */
export const OG_PALETTE_LIGHT: OgThemePalette = {
  bg: "#ffffff",
  grid: "rgba(0,0,0,0.05)",
  glowA: "rgba(0,51,254,0.22)", // colors.primary["500"] at 22% opacity
  glowB: "rgba(11,241,195,0.20)", // colors.accent["500"] at 20% opacity
  title: "#0a0a0a",
  subtitle: "rgba(10,10,10,0.66)",
  accent: "#0033fe", // colors.primary["500"]
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
