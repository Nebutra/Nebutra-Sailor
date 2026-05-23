"use client";

import { Connection } from "@nebutra/icons";
import { AnimatedBeam, DotPattern, MagicCard } from "@nebutra/ui/primitives";
import { useRef } from "react";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

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
 * Integrations specimen — central bus hub + plug-in ports.
 *
 * The metaphor reads through AnimatedBeams flowing hub ↔ ports, not painted
 * lines. Sibling differentiation:
 *   - port count: 5–7 derived from slug
 *   - layout rotation: 0–360° derived from slug (rotates the ring start)
 *   - curvature: per-port sign flipped by slug parity
 *   - beam reverse direction: alternates per index, flipped by slug
 */
export function BusSpecimen({ entry, locale, compact = false }: Props) {
  const portCount = 5 + seeded(entry.slug, 3); // 5..7
  const rotationOffset = (seeded(entry.slug, 360, 13) / 360) * Math.PI * 2;
  const curvatureFlip = seeded(entry.slug, 2, 17) === 0 ? 1 : -1;
  const reverseFlip = seeded(entry.slug, 2, 23) === 0;

  const nodes = getSpecimenNodes(entry, portCount);
  const sig = entrySignature(entry);

  // Static refs — never call useRef in a loop. Allocate max (7) and slice.
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const portRef0 = useRef<HTMLDivElement>(null);
  const portRef1 = useRef<HTMLDivElement>(null);
  const portRef2 = useRef<HTMLDivElement>(null);
  const portRef3 = useRef<HTMLDivElement>(null);
  const portRef4 = useRef<HTMLDivElement>(null);
  const portRef5 = useRef<HTMLDivElement>(null);
  const portRef6 = useRef<HTMLDivElement>(null);
  const portRefs = [portRef0, portRef1, portRef2, portRef3, portRef4, portRef5, portRef6];

  // Radius (in %) — center 50,50 → port ring. Slightly tighter in compact.
  const radius = compact ? 36 : 38;

  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  // Compact mode: drop AnimatedBeams (refs don't measure correctly at ~96px tall).
  // Render hub + 4 chips on a static ring; no SVG measurement needed.
  const renderedNodes = compact ? nodes.slice(0, 4) : nodes;
  const renderedRefs = compact ? portRefs.slice(0, 4) : portRefs.slice(0, nodes.length);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} integration bus specimen`}
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

      {/* Tone halo — the variant's colored "atmosphere" */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${entry.tone.halo} 0%, transparent 60%)`,
        }}
      />

      {/* Central hub — MagicCard with the Connection icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={hubRef} className={compact ? "h-16 w-16" : "h-24 w-24"}>
          <MagicCard
            className="h-full w-full rounded-2xl"
            gradientSize={140}
            gradientFrom={entry.tone.accent}
            gradientTo={entry.tone.secondary}
            gradientColor={entry.tone.chip}
          >
            <div className="relative flex h-full w-full flex-col items-center justify-center rounded-2xl">
              <Connection
                className={compact ? "size-4" : "size-5"}
                style={{ color: entry.tone.accent }}
                aria-hidden="true"
              />
              {!compact ? (
                <span
                  className="mt-1 max-w-[80%] truncate text-center font-mono text-[9px] uppercase tracking-[0.24em] text-foreground/75"
                  translate="no"
                >
                  bus
                </span>
              ) : null}
            </div>
          </MagicCard>
        </div>
      </div>

      {/* Ports — placed on a ring around the hub */}
      {renderedNodes.map((node, index) => {
        const angle =
          (index / Math.max(renderedNodes.length, 1)) * Math.PI * 2 - Math.PI / 2 + rotationOffset;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isPrimary = index === 0;
        return (
          <div
            key={`${node}-${index}`}
            ref={renderedRefs[index]}
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
                className="flex items-center gap-1.5 rounded-md border bg-background/70 px-2.5 py-1.5 font-mono text-[10px] text-foreground/85 backdrop-blur-md"
                style={{
                  borderColor: isPrimary
                    ? `color-mix(in oklch, ${entry.tone.accent} 65%, transparent)`
                    : entry.tone.hairline,
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
                <span className="ml-1 text-muted-foreground">:{pad(8080 + index, 4)}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Beams — full mode only. AnimatedBeam needs measured DOM. */}
      {!compact
        ? renderedNodes.map((node, index) => {
            const curvature = (index % 2 === 0 ? 36 : -36) * curvatureFlip;
            const beamReverse = reverseFlip ? index % 2 === 0 : index % 2 === 1;
            return (
              <AnimatedBeam
                key={`beam-${node}-${index}`}
                containerRef={containerRef}
                fromRef={hubRef}
                toRef={renderedRefs[index]}
                curvature={curvature}
                duration={4 + (index % 3)}
                delay={index * 0.35}
                reverse={beamReverse}
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
              bus · {renderedNodes.length} ports ·{" "}
              <span style={{ color: entry.tone.accent }} translate="no">
                {entry.tone.label}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground/60">
              sig {sig} · rot {Math.round((rotationOffset * 180) / Math.PI)}°
            </div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>{locale === "zh" ? "可替换连接层" : "swappable integration layer"}</div>
            <div className="mt-1 text-muted-foreground/60">
              ∮ {entry.children.length || "—"} adapters
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
