import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Platform specimen — layered control-plane strata.
 *
 * Each layer is a horizontal slab with a depth offset, like geological
 * strata. The rightmost vertical bar chart hints at the depth/height
 * of each layer's responsibility (we don't claim it's real telemetry).
 */
export function StackSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 6);
  const accent = entry.tone.accent;
  const secondary = entry.tone.secondary;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} platform stack specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* strata layers */}
      <div className="absolute inset-x-[6%] inset-y-[10%] flex flex-col gap-2">
        {nodes.map((node, index) => {
          const depth = 100 - (index / Math.max(nodes.length - 1, 1)) * 60; // 100 → 40
          const tint = index % 2 === 0 ? accent : secondary;
          return (
            <div
              key={`${node}-${index}`}
              className="relative flex flex-1 items-center overflow-hidden rounded-sm border backdrop-blur-md"
              style={{
                borderColor: entry.tone.hairline,
                background: `color-mix(in oklch, var(--background) 65%, transparent)`,
              }}
            >
              {/* depth bar */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${depth}%`,
                  background: `linear-gradient(90deg, ${tint}33, transparent)`,
                }}
              />

              {/* row content */}
              <div className="relative z-10 flex w-full items-center justify-between gap-3 px-4 py-2">
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground"
                    translate="no"
                  >
                    L{pad(nodes.length - index)}
                  </span>
                  <span
                    className="font-mono text-[12px] uppercase tracking-[0.12em]"
                    style={{ color: "color-mix(in oklch, var(--foreground), transparent 10%)" }}
                    translate="no"
                  >
                    {node}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* tick markers */}
                  <div className="flex items-center gap-[3px]">
                    {Array.from({ length: 5 }).map((_, tickIndex) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: decorative ticks have no identity
                        key={tickIndex}
                        className="block h-2 w-px"
                        style={{
                          background:
                            tickIndex < Math.round((depth / 100) * 5)
                              ? tint
                              : "color-mix(in oklch, var(--foreground), transparent 80%)",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
                    translate="no"
                  >
                    {Math.round(depth)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* annotation rail */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>stack · {nodes.length} strata</div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "最低共享层" : "lowest shared layer"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
