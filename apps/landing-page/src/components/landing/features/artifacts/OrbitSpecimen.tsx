"use client";

import { Sparkles } from "@nebutra/icons";
import { AnimatedBeam, BorderTrail, DotPattern, MagicCard } from "@nebutra/ui/primitives";
import { useRef } from "react";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

// Hash → integer in [0, max). Deterministic per-slug knob.
function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

/**
 * AI runtime specimen — central planner + tool-call satellites.
 *
 * The "orbit" metaphor reads through AnimatedBeam flow (planner → tools),
 * not painted concentric rings. Sibling differentiation:
 *   - satellite count: 5–8 derived from slug
 *   - rotation offset: 0–2π derived from slug
 *   - beam curvature sign: alternates per index, flipped by slug parity
 */
export function OrbitSpecimen({ entry, locale, compact = false }: Props) {
  const satelliteCount = 5 + seeded(entry.slug, 4); // 5..8
  const rotationOffset = (seeded(entry.slug, 360, 7) / 360) * Math.PI * 2;
  const curvatureFlip = seeded(entry.slug, 2, 11) === 0 ? 1 : -1;

  const nodes = getSpecimenNodes(entry, satelliteCount);
  const sig = entrySignature(entry);

  // Refs declared statically (max 8 satellites) so hooks aren't called in a loop.
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const s0 = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLDivElement>(null);
  const s2 = useRef<HTMLDivElement>(null);
  const s3 = useRef<HTMLDivElement>(null);
  const s4 = useRef<HTMLDivElement>(null);
  const s5 = useRef<HTMLDivElement>(null);
  const s6 = useRef<HTMLDivElement>(null);
  const s7 = useRef<HTMLDivElement>(null);
  const satelliteRefs = [s0, s1, s2, s3, s4, s5, s6, s7];

  // Radius (in %) — center 50,50 → satellite ring.
  const radius = compact ? 34 : 36;

  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} orbit specimen`}
      style={minHeightStyle}
    >
      {/* Background dot pattern — radial mask for vignette */}
      <DotPattern
        glow={!compact}
        width={20}
        height={20}
        cr={1}
        className="text-muted-foreground/30 [mask-image:radial-gradient(circle_at_center,white,transparent_80%)]"
      />

      {/* Tone halo — gives the AI variant its colored "atmosphere" */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${entry.tone.halo} 0%, transparent 60%)`,
        }}
      />

      {/* Central planner node — MagicCard with BorderTrail */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={centerRef} className={compact ? "h-16 w-16" : "h-24 w-24"}>
          <MagicCard
            className="h-full w-full rounded-full"
            gradientSize={140}
            gradientFrom={entry.tone.accent}
            gradientTo={entry.tone.secondary}
            gradientColor={entry.tone.chip}
          >
            <div className="relative flex h-full w-full flex-col items-center justify-center rounded-full">
              {!compact ? <BorderTrail size={48} className="bg-foreground/60" /> : null}
              <Sparkles
                className={compact ? "size-4" : "size-5"}
                style={{ color: entry.tone.accent }}
                aria-hidden="true"
              />
              {!compact ? (
                <span
                  className="mt-1 max-w-[80%] truncate text-center font-mono text-[9px] uppercase tracking-[0.24em] text-foreground/75"
                  translate="no"
                >
                  {entry.slug.length > 9 ? `${entry.slug.slice(0, 9)}…` : entry.slug}
                </span>
              ) : null}
            </div>
          </MagicCard>
        </div>
      </div>

      {/* Satellite tool calls — placed on a ring around center */}
      {nodes.map((node, index) => {
        const angle =
          (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2 + rotationOffset;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isPrimary = index === 0;
        return (
          <div
            key={`${node}-${index}`}
            ref={satelliteRefs[index]}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {compact ? (
              <span
                aria-hidden="true"
                className="block size-2 rounded-full"
                style={{
                  background: entry.tone.accent,
                  boxShadow: `0 0 10px ${entry.tone.accent}`,
                }}
              />
            ) : (
              <div
                className="flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 font-mono text-[10px] text-foreground/85 backdrop-blur-md"
                style={{
                  borderColor: isPrimary
                    ? `color-mix(in oklch, ${entry.tone.accent} 65%, transparent)`
                    : `color-mix(in oklch, ${entry.tone.accent} 28%, transparent)`,
                  boxShadow: isPrimary ? `0 0 16px -4px ${entry.tone.accent}` : "none",
                }}
                translate="no"
              >
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{
                    background: entry.tone.accent,
                    boxShadow: `0 0 6px ${entry.tone.accent}`,
                  }}
                  aria-hidden="true"
                />
                <span className="max-w-[7rem] truncate">{node}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Beams — only in full mode. AnimatedBeam needs measured DOM. */}
      {!compact
        ? nodes.map((node, index) => {
            // Curvature alternates direction per index, flipped per slug.
            const curvature = (index % 2 === 0 ? 40 : -40) * curvatureFlip;
            return (
              <AnimatedBeam
                key={`beam-${node}-${index}`}
                containerRef={containerRef}
                fromRef={centerRef}
                toRef={satelliteRefs[index]}
                curvature={curvature}
                duration={4 + (index % 3)}
                delay={index * 0.4}
                reverse={index % 2 === 1}
                tone="brand"
                intensity={index === 0 ? "strong" : "normal"}
              />
            );
          })
        : null}

      {/* Annotations — full mode only */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-8 bottom-6 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>
              orbit · loop {nodes.length} ·{" "}
              <span style={{ color: entry.tone.accent }} translate="no">
                {entry.tone.label}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground/60">
              sig {sig} · rot {Math.round((rotationOffset * 180) / Math.PI)}°
            </div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>{locale === "zh" ? "代理协奏环" : "agent orbit"}</div>
            <div className="mt-1 text-muted-foreground/60">
              ∮ {entry.children.length || "—"} tool calls
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
