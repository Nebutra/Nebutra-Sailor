import { Sparkles } from "@nebutra/icons";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

// Hash → integer in [0, max).
function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

/**
 * AI runtime specimen — concentric orbits with satellite tool calls.
 *
 * Sibling differentiation: rotation offset, satellite count, and a
 * deterministic "ring axis tilt" are all derived from the slug so two
 * AI packages don't look identical.
 */
export function OrbitSpecimen({ entry, locale, compact = false }: Props) {
  // Sibling-aware geometry knobs.
  const satelliteCount = 5 + seeded(entry.slug, 4); // 5–8
  const rotationOffset = (seeded(entry.slug, 360, 7) / 360) * Math.PI * 2;
  const tiltDeg = -8 + seeded(entry.slug, 16, 13); // -8°..+7°

  const nodes = getSpecimenNodes(entry, satelliteCount);
  const accent = entry.tone.accent;
  const secondary = entry.tone.secondary;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  // Geometry knobs that scale with mode.
  const centerSize = compact ? "w-[18%]" : "w-[14%]";
  const innerOrbit = compact ? "w-[42%]" : "w-[36%]";
  const middleOrbit = compact ? "w-[66%]" : "w-[60%]";
  const outerOrbit = compact ? "w-[92%]" : "w-[88%]";
  const satelliteRadius = compact ? 30 : 30; // % of half-size

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} orbit specimen`}
      style={minHeightStyle}
    >
      {/* tone halo — punchier on dark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${entry.tone.halo} 0%, transparent 60%)`,
        }}
      />
      {/* second smaller halo for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${entry.tone.chip} 0%, transparent 32%)`,
        }}
      />

      {/* concentric orbits — tilted on x-axis for depth */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
        style={{ transform: `rotateZ(${tiltDeg}deg)` }}
      >
        {/* outer dashed ring */}
        <div
          className={`absolute aspect-square ${outerOrbit} rounded-full`}
          style={{
            border: `1px dashed ${accent}`,
            opacity: 0.35,
          }}
        />
        {/* middle solid ring — primary orbit */}
        <div
          className={`absolute aspect-square ${middleOrbit} rounded-full`}
          style={{
            border: `1px solid ${accent}`,
            opacity: 0.7,
            boxShadow: `0 0 24px -4px ${accent}, inset 0 0 24px -8px ${accent}`,
          }}
        />
        {/* inner ring */}
        <div
          className={`absolute aspect-square ${innerOrbit} rounded-full`}
          style={{
            border: `1px solid ${secondary}`,
            opacity: 0.55,
          }}
        />

        {/* sweep — rotating conic on middle ring */}
        <div
          className={`absolute aspect-square ${middleOrbit} rounded-full nebutra-orbit-sweep`}
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 18deg, transparent 60deg)`,
            WebkitMask:
              "radial-gradient(circle, transparent 49%, black 49.6%, black 50.4%, transparent 51%)",
            mask: "radial-gradient(circle, transparent 49%, black 49.6%, black 50.4%, transparent 51%)",
            opacity: 0.85,
          }}
        />

        {/* secondary sweep — counter-rotating dim, on outer ring */}
        <div
          className={`absolute aspect-square ${outerOrbit} rounded-full nebutra-orbit-sweep-reverse`}
          style={{
            background: `conic-gradient(from 200deg, transparent 0deg, ${secondary} 12deg, transparent 40deg)`,
            WebkitMask:
              "radial-gradient(circle, transparent 49%, black 49.6%, black 50.4%, transparent 51%)",
            mask: "radial-gradient(circle, transparent 49%, black 49.6%, black 50.4%, transparent 51%)",
            opacity: 0.55,
          }}
        />
      </div>

      {/* axis cross — gives the orbit a "telescope reticle" feel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="absolute h-px w-[14%]"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
        <div
          className="absolute w-px h-[14%]"
          style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)` }}
        />
      </div>

      {/* central planner node — smaller, denser */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative flex aspect-square ${centerSize} flex-col items-center justify-center rounded-full border backdrop-blur-md`}
          style={{
            borderColor: `color-mix(in oklch, ${accent} 55%, transparent)`,
            background: `radial-gradient(circle, ${entry.tone.chip} 0%, oklch(0.16 0.012 250) 70%)`,
            boxShadow: `0 0 40px -8px ${accent}, inset 0 0 20px -10px ${accent}`,
          }}
        >
          <Sparkles
            className={compact ? "size-3.5" : "size-5"}
            style={{ color: accent }}
            aria-hidden="true"
          />
          {!compact ? (
            <span
              className="mt-1 max-w-[82%] truncate text-center font-mono text-[9px] uppercase tracking-[0.24em]"
              style={{ color: "rgba(255,255,255,0.78)" }}
              translate="no"
            >
              {entry.slug.length > 9 ? `${entry.slug.slice(0, 9)}…` : entry.slug}
            </span>
          ) : null}
        </div>
      </div>

      {/* satellite tool calls — distributed on outer ring with slug rotation */}
      {nodes.map((node, index) => {
        const angle =
          (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2 + rotationOffset;
        const x = 50 + satelliteRadius * Math.cos(angle);
        const y = 50 + satelliteRadius * Math.sin(angle);
        const isPrimary = index === 0;
        return (
          <div
            key={`${node}-${index}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] backdrop-blur-md"
              style={{
                borderColor: isPrimary
                  ? `color-mix(in oklch, ${accent} 65%, transparent)`
                  : `color-mix(in oklch, ${accent} 28%, transparent)`,
                background: isPrimary
                  ? `color-mix(in oklch, ${accent} 16%, oklch(0.12 0.014 250))`
                  : "oklch(0.16 0.012 250 / 0.7)",
                color: "rgba(255,255,255,0.88)",
                boxShadow: isPrimary ? `0 0 16px -4px ${accent}` : "none",
              }}
              translate="no"
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 6px ${accent}`,
                }}
                aria-hidden="true"
              />
              <span className="max-w-[7rem] truncate">{node}</span>
            </div>
          </div>
        );
      })}

      {/* dust particles — sprinkled along the middle orbit */}
      {!compact
        ? Array.from({ length: 12 }).map((_, dustIndex) => {
            const dustAngle = (dustIndex / 12) * Math.PI * 2 + rotationOffset + Math.PI / 12;
            const dustRadius = 30; // matches middleOrbit at w-[60%]
            const x = 50 + dustRadius * Math.cos(dustAngle);
            const y = 50 + dustRadius * Math.sin(dustAngle);
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: pure decoration
                key={dustIndex}
                aria-hidden="true"
                className="pointer-events-none absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  background: accent,
                  opacity: dustIndex % 3 === 0 ? 0.6 : 0.18,
                }}
              />
            );
          })
        : null}

      {/* corner annotations */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-8 bottom-6 flex items-end justify-between">
          <div
            className="font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <div>
              orbit · loop {nodes.length} ·{" "}
              <span style={{ color: accent }} translate="no">
                {entry.tone.label}
              </span>
            </div>
            <div className="mt-1" style={{ color: "rgba(255,255,255,0.32)" }}>
              sig {sig} · tilt {tiltDeg}°
            </div>
          </div>
          <div
            className="text-right font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <div>{locale === "zh" ? "代理协奏环" : "agent orbit"}</div>
            <div className="mt-1" style={{ color: "rgba(255,255,255,0.32)" }}>
              ∮ {entry.children.length || "—"} tool calls
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
