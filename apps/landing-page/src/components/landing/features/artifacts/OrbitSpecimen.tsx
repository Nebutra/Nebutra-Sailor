import { Sparkles } from "@nebutra/icons";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * AI runtime specimen — concentric orbits with satellite tool calls.
 *
 * The metaphor: an agent loop with tools rotating around a central
 * planner. Outer ring is reserved for the agent's "context current"
 * (a subtle keyframed sweep). Numerals on the side hint at token
 * counts / step ids without committing to specifics.
 */
export function OrbitSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 5);
  const accent = entry.tone.accent;
  const secondary = entry.tone.secondary;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "260px" }
    : { minHeight: "clamp(420px, 60vw, 600px)" };

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} orbit specimen`}
      style={minHeightStyle}
    >
      {/* radial halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* concentric orbits */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="absolute aspect-square w-[88%] rounded-full border"
          style={{ borderColor: `color-mix(in oklch, ${accent} 18%, transparent)` }}
        />
        <div
          className="absolute aspect-square w-[68%] rounded-full border"
          style={{ borderColor: `color-mix(in oklch, ${accent} 28%, transparent)` }}
        />
        <div
          className="absolute aspect-square w-[48%] rounded-full border"
          style={{ borderColor: `color-mix(in oklch, ${secondary} 32%, transparent)` }}
        />

        {/* slow orbit sweep — single dot sliding round the middle ring */}
        <div
          className="absolute aspect-square w-[68%] rounded-full nebutra-orbit-sweep"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${accent}55 24deg, transparent 56deg)`,
            WebkitMask:
              "radial-gradient(circle, transparent 49%, black 50%, black 50.6%, transparent 51.2%)",
            mask: "radial-gradient(circle, transparent 49%, black 50%, black 50.6%, transparent 51.2%)",
          }}
        />
      </div>

      {/* central planner node */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative flex aspect-square w-[22%] flex-col items-center justify-center rounded-full border backdrop-blur-md"
          style={{
            borderColor: entry.tone.hairline,
            background: `color-mix(in oklch, var(--background) 60%, transparent)`,
            boxShadow: `0 0 60px ${entry.tone.halo}`,
          }}
        >
          <Sparkles className="size-5" style={{ color: accent }} aria-hidden="true" />
          <span
            className="mt-1 max-w-[80%] truncate text-center font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in oklch, var(--foreground), transparent 25%)" }}
            translate="no"
          >
            {entry.label}
          </span>
        </div>
      </div>

      {/* satellite tool calls — distributed around the middle orbit */}
      {nodes.map((node, index) => {
        const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const radius = 34; // percentage of half-size
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        return (
          <div
            key={`${node}-${index}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] backdrop-blur-md"
              style={{
                borderColor: entry.tone.hairline,
                background: entry.tone.chip,
                color: "color-mix(in oklch, var(--foreground), transparent 12%)",
              }}
              translate="no"
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: accent }}
                aria-hidden="true"
              />
              <span className="max-w-[8rem] truncate">{node}</span>
            </div>
          </div>
        );
      })}

      {/* corner annotations */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>orbit · loop {nodes.length}</div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>{locale === "zh" ? "代理协奏" : "agent loop"}</div>
            <div className="mt-1 text-foreground/40">∮ 中心规划</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
