import { Compass, Globe, Sparkles, Star } from "@nebutra/icons";
import type { ComponentType } from "react";

/**
 * Brand-native decorative tile for the newsroom — Nebutra's answer to the
 * playful illustration squares on reference newsrooms. Pure brand gradient +
 * a single faint Geist glyph, never a hand-drawn doodle.
 */
export type NewsDecorVariant = "aurora" | "nebula" | "cyan" | "violet";

const VARIANT_BACKGROUND: Record<NewsDecorVariant, string> = {
  aurora: "hsl(var(--primary))",
  nebula: "linear-gradient(135deg, var(--brand-tertiary), hsl(var(--primary)))",
  cyan: "linear-gradient(135deg, var(--cyan-9), hsl(var(--primary)))",
  violet: "linear-gradient(150deg, hsl(var(--primary)), var(--brand-tertiary))",
};

const VARIANT_GLYPH: Record<NewsDecorVariant, ComponentType<{ className?: string }>> = {
  aurora: Sparkles,
  nebula: Globe,
  cyan: Compass,
  violet: Star,
};

export function NewsDecorTile({
  variant = "aurora",
  className,
  glyphClassName = "size-24",
}: {
  variant?: NewsDecorVariant;
  className?: string;
  glyphClassName?: string;
}) {
  const Glyph = VARIANT_GLYPH[variant];

  return (
    <div
      aria-hidden
      className={`relative flex items-center justify-center overflow-hidden rounded-[var(--radius-xl)] ${className ?? ""}`}
      style={{ background: VARIANT_BACKGROUND[variant] }}
    >
      {/* Soft top-left highlight for depth, brand-token driven */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, rgb(255 255 255 / 0.22), transparent 60%)",
        }}
      />
      <Glyph className={`relative text-white/80 ${glyphClassName}`} />
    </div>
  );
}
