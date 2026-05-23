import { Terminal } from "@nebutra/icons";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Operations specimen — a cassette / tape-reel artifact.
 *
 * Two reels, an ASCII-style frame, a row of "ops" cue cards underneath
 * for nodes (CLI, preset, compliance...). Neutral palette by design —
 * ops live below product surface tone.
 */
export function TapeSpecimen({ entry, locale, compact = false }: Props) {
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
      aria-label={`${entry.label} operations tape specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 25%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* ASCII frame */}
      <div className="absolute inset-x-[6%] top-[6%] flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
        <span>┌─ ops · cassette</span>
        <span>{entry.slug}.tape ─┐</span>
      </div>

      {/* twin reels */}
      <div className="absolute inset-x-[12%] top-[18%] h-[36%]">
        <div className="relative flex h-full items-center justify-between">
          {/* left reel */}
          <div
            className="relative flex aspect-square h-full items-center justify-center rounded-full border"
            style={{
              borderColor: entry.tone.hairline,
              background: `radial-gradient(circle, color-mix(in oklch, ${accent} 12%, transparent) 0%, transparent 70%)`,
            }}
          >
            <div
              className="aspect-square w-[36%] rounded-full border"
              style={{ borderColor: accent, background: entry.tone.chip }}
              aria-hidden="true"
            />
            {/* spokes */}
            {[0, 60, 120].map((deg) => (
              <div
                key={deg}
                className="absolute h-px w-[70%]"
                style={{
                  background: `color-mix(in oklch, ${accent} 30%, transparent)`,
                  transform: `rotate(${deg}deg)`,
                }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* tape between reels */}
          <div
            className="absolute left-[18%] right-[18%] top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <div
              className="h-3 w-full rounded-sm"
              style={{ background: `linear-gradient(90deg, ${accent}66, ${secondary}66)` }}
            />
            <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
              <span>›› play</span>
              <span>{sig}</span>
              <span>00:42:18</span>
            </div>
          </div>

          {/* right reel */}
          <div
            className="relative flex aspect-square h-full items-center justify-center rounded-full border"
            style={{
              borderColor: entry.tone.hairline,
              background: `radial-gradient(circle, color-mix(in oklch, ${secondary} 12%, transparent) 0%, transparent 70%)`,
            }}
          >
            <div
              className="aspect-square w-[36%] rounded-full border"
              style={{ borderColor: secondary, background: entry.tone.chip }}
              aria-hidden="true"
            />
            {[0, 60, 120].map((deg) => (
              <div
                key={deg}
                className="absolute h-px w-[70%]"
                style={{
                  background: `color-mix(in oklch, ${secondary} 30%, transparent)`,
                  transform: `rotate(${deg + 30}deg)`,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      {/* cue cards */}
      <div className="absolute inset-x-[6%] top-[62%] grid grid-cols-2 gap-2 sm:grid-cols-3">
        {nodes.map((node, index) => (
          <div
            key={`${node}-${index}`}
            className="flex items-center gap-2 rounded-sm border px-3 py-2 backdrop-blur-md"
            style={{
              borderColor: entry.tone.hairline,
              background: `color-mix(in oklch, var(--background) 70%, transparent)`,
            }}
          >
            <Terminal className="size-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate font-mono text-[11px] uppercase tracking-[0.08em]"
                style={{ color: "color-mix(in oklch, var(--foreground), transparent 15%)" }}
                translate="no"
              >
                {node}
              </span>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground"
                translate="no"
              >
                cue · {pad(index + 1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ASCII footer */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-[6%] bottom-[6%] flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          <span>└─ rel · {nodes.length} cues</span>
          <span>{locale === "zh" ? "发布与运维边界" : "release & ops boundary"} ─┘</span>
        </div>
      ) : null}
    </div>
  );
}
