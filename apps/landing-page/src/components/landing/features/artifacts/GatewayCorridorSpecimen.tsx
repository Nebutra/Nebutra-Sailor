"use client";

import { Api, ArrowRight, Connection, Lightning, LockClosed } from "@nebutra/icons";
import { AnimatedBeam, BorderTrail, DotPattern, Kbd, MagicCard } from "@nebutra/ui/primitives";
import { useRef } from "react";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

const MAX_MIDDLEWARE = 6;
const STOP_ICONS = [LockClosed, Connection, Lightning, Api, LockClosed, Connection];

function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

/**
 * Gateway specimen — request corridor.
 *
 * REQ → middleware stops (auth, tenant, rate-limit, route, …) → RES,
 * rendered as MagicCard pipeline with AnimatedBeams between consecutive
 * nodes. Sibling differentiation: a single BorderTrail rotates onto a
 * different middleware per slug.
 */
export function GatewayCorridorSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, MAX_MIDDLEWARE);
  const sig = entrySignature(entry);
  const trailIndex = seeded(entry.slug, Math.max(nodes.length, 1));

  // Static refs (max nodes + REQ + RES). Hooks rules: never in a loop.
  const containerRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<HTMLDivElement>(null);
  const resRef = useRef<HTMLDivElement>(null);
  const mwRef0 = useRef<HTMLDivElement>(null);
  const mwRef1 = useRef<HTMLDivElement>(null);
  const mwRef2 = useRef<HTMLDivElement>(null);
  const mwRef3 = useRef<HTMLDivElement>(null);
  const mwRef4 = useRef<HTMLDivElement>(null);
  const mwRef5 = useRef<HTMLDivElement>(null);
  const middlewareRefs = [mwRef0, mwRef1, mwRef2, mwRef3, mwRef4, mwRef5];

  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  // Build a left-to-right ordered list of refs for beam pairing.
  const pipelineRefs = [reqRef, ...middlewareRefs.slice(0, nodes.length), resRef];

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} gateway corridor specimen`}
      style={minHeightStyle}
    >
      <DotPattern
        glow={!compact}
        width={20}
        height={20}
        cr={1}
        className="text-muted-foreground/25 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      {/* Corridor row — REQ · mw0 · mw1 · … · RES */}
      <div className="absolute inset-x-[4%] top-1/2 flex -translate-y-1/2 items-center justify-between gap-2 sm:gap-3">
        {/* REQ entry chip */}
        <div ref={reqRef} className="flex flex-col items-center gap-1.5">
          <Kbd
            small={compact}
            className="border-[color:var(--border)] bg-background/80 backdrop-blur-md"
            style={{ color: entry.tone.accent }}
            aria-label="request entry"
          >
            REQ
          </Kbd>
          {!compact ? (
            <ArrowRight
              className="size-3.5"
              style={{ color: entry.tone.accent }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        {/* Middleware stops */}
        {nodes.map((node, index) => {
          const Icon = STOP_ICONS[index % STOP_ICONS.length];
          const isTrail = !compact && index === trailIndex;
          return (
            <div
              key={`${node}-${index}`}
              ref={middlewareRefs[index]}
              className="flex min-w-0 flex-1"
            >
              <MagicCard
                className="relative h-full w-full overflow-hidden rounded-[var(--radius-md)]"
                gradientSize={compact ? 90 : 140}
                gradientFrom={entry.tone.accent}
                gradientTo={entry.tone.secondary}
                gradientColor={entry.tone.chip}
              >
                <div className="relative flex w-full flex-col items-center gap-1 px-2 py-2.5 sm:px-3">
                  {isTrail ? (
                    <BorderTrail size={compact ? 40 : 60} className="bg-foreground/60" />
                  ) : null}
                  <Icon
                    className={compact ? "size-3.5" : "size-4"}
                    style={{ color: entry.tone.accent }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground"
                    translate="no"
                  >
                    MW·{pad(index + 1)}
                  </span>
                  {!compact ? (
                    <span
                      className="max-w-full truncate font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/80"
                      translate="no"
                    >
                      {node}
                    </span>
                  ) : null}
                </div>
              </MagicCard>
            </div>
          );
        })}

        {/* RES exit chip */}
        <div ref={resRef} className="flex flex-col items-center gap-1.5">
          {!compact ? (
            <ArrowRight
              className="size-3.5"
              style={{ color: entry.tone.secondary }}
              aria-hidden="true"
            />
          ) : null}
          <Kbd
            small={compact}
            className="border-[color:var(--border)] bg-background/80 backdrop-blur-md"
            style={{ color: entry.tone.secondary }}
            aria-label="response exit"
          >
            RES
          </Kbd>
        </div>
      </div>

      {/* Compact: static dotted connector. Full: AnimatedBeams. */}
      {compact ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[6%] top-1/2 -translate-y-1/2 border-t border-dashed"
          style={{ borderColor: entry.tone.hairline }}
        />
      ) : (
        pipelineRefs.slice(0, -1).map((fromRef, index) => {
          const toRef = pipelineRefs[index + 1];
          if (!fromRef || !toRef) return null;
          return (
            <AnimatedBeam
              key={`beam-${index}`}
              containerRef={containerRef}
              fromRef={fromRef}
              toRef={toRef}
              curvature={0}
              duration={3 + (index % 2)}
              delay={index * 0.35}
              tone="brand"
              intensity={index === trailIndex ? "strong" : "normal"}
            />
          );
        })
      )}

      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>
              corridor · {nodes.length} mw ·{" "}
              <span style={{ color: entry.tone.accent }} translate="no">
                {entry.tone.label}
              </span>
            </div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "请求入口契约" : "request entrypoint contract"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
