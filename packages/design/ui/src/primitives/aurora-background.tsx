import type React from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AuroraBackground component
 *
 * @description
 * Ambient "aurora halo" background for marketing sections. The 2026 visual
 * language replacement for the 2022-2024 single-blob `blur-[120px] bg-primary/10`
 * pattern. Renders as a stack of low-saturation multi-stop radial gradients with
 * an optional fractal-noise grain overlay.
 *
 * Server Component compatible (no hooks, no client APIs).
 *
 * **Placement contract:**
 * - Parent container MUST be `relative` (or `absolute` / `fixed`).
 * - The wrapper is `absolute inset-0 -z-10 pointer-events-none`.
 * - Decorative only — `aria-hidden="true"`.
 */
export interface AuroraBackgroundProps {
  /** Visual variant — different mood. Default: `subtle`. */
  variant?: "subtle" | "vivid" | "monochrome";
  /** Opacity multiplier 0-1. Default: 0.5. */
  intensity?: number;
  /** Position of the dominant aurora — affects gradient anchor points. */
  position?: "top" | "center" | "bottom";
  /** Add noise grain overlay (default true). Set false if container already has grain. */
  noise?: boolean;
  /** Additional class names — merged onto the outer wrapper. */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Fractal-noise SVG used as the grain overlay. Programmatically generated via
 * SVG `<feTurbulence>` — not a hand-crafted icon. Inlined as a data URI so the
 * component has zero runtime fetches.
 */
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>`;

const NOISE_DATA_URI = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

/**
 * Radial-gradient anchor coordinates per `position`. Each tuple is rendered as
 * three stacked `radial-gradient(at X% Y%, ...)` layers.
 */
const POSITION_ANCHORS: Record<
  NonNullable<AuroraBackgroundProps["position"]>,
  readonly [string, string, string]
> = {
  top: ["50% 10%", "20% 25%", "80% 30%"],
  center: ["27% 37%", "97% 21%", "52% 99%"],
  bottom: ["50% 90%", "20% 75%", "80% 80%"],
};

/**
 * Color stops per variant. Three CSS variables — one per radial layer.
 * `monochrome` deliberately uses low-step neutrals to give a non-color
 * ambient wash for neutral sections (e.g. Pricing).
 */
const VARIANT_COLORS: Record<
  NonNullable<AuroraBackgroundProps["variant"]>,
  readonly [string, string, string]
> = {
  subtle: ["var(--blue-9)", "var(--cyan-9)", "var(--blue-7)"],
  vivid: ["var(--blue-9)", "var(--cyan-9)", "var(--brand-tertiary)"],
  monochrome: ["var(--neutral-6)", "var(--neutral-7)", "var(--neutral-6)"],
};

/**
 * Opacity multiplier per variant — applied on top of the user-provided
 * `intensity` prop.
 */
const VARIANT_INTENSITY: Record<NonNullable<AuroraBackgroundProps["variant"]>, number> = {
  subtle: 0.5,
  vivid: 0.8,
  monochrome: 0.6,
};

// =============================================================================
// Component
// =============================================================================

/**
 * AuroraBackground — ambient "aurora halo" backdrop for marketing sections.
 *
 * @example
 * ```tsx
 * // Hero section — vivid + top anchor
 * <section className="relative overflow-hidden py-32">
 *   <AuroraBackground variant="vivid" position="top" />
 *   <h1>Welcome to Nebutra</h1>
 * </section>
 *
 * // Pricing — neutral mono wash, no grain (already has grain on parent)
 * <section className="relative">
 *   <AuroraBackground variant="monochrome" noise={false} />
 *   <PricingGrid />
 * </section>
 * ```
 */
export function AuroraBackground({
  variant = "subtle",
  intensity = 0.5,
  position = "center",
  noise = true,
  className,
}: AuroraBackgroundProps) {
  const [a, b, c] = POSITION_ANCHORS[position];
  const [colorA, colorB, colorC] = VARIANT_COLORS[variant];
  const effectiveOpacity = Math.max(0, Math.min(1, intensity * VARIANT_INTENSITY[variant]));

  const auroraStyle: React.CSSProperties = {
    backgroundImage: [
      `radial-gradient(at ${a}, ${colorA} 0px, transparent 50%)`,
      `radial-gradient(at ${b}, ${colorB} 0px, transparent 50%)`,
      `radial-gradient(at ${c}, ${colorC} 0px, transparent 50%)`,
    ].join(", "),
    filter: "blur(80px) saturate(1.2)",
    opacity: effectiveOpacity,
  };

  const noiseStyle: React.CSSProperties = {
    backgroundImage: NOISE_DATA_URI,
    backgroundSize: "200px 200px",
    opacity: 0.035,
    mixBlendMode: "overlay",
  };

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0"
        style={auroraStyle}
        data-aurora-variant={variant}
        data-aurora-position={position}
      />
      {noise ? <div className="absolute inset-0" style={noiseStyle} data-aurora-noise="" /> : null}
    </div>
  );
}

AuroraBackground.displayName = "AuroraBackground";

export default AuroraBackground;
