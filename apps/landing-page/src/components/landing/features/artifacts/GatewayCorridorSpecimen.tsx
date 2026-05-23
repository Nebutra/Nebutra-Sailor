import { ArrowRight } from "@nebutra/icons";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Gateway specimen — a left→right request corridor.
 *
 * The request lane is a single horizontal track punctuated by
 * middleware "stops" (auth, tenant, rate-limit, route, response).
 * Arrows underline direction; the lane glows with a gradient sweep.
 */
export function GatewayCorridorSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 6);
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
      aria-label={`${entry.label} gateway corridor specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* request lane (centered) */}
      <div className="absolute inset-x-[5%] top-[42%]">
        <div
          className="h-12 rounded-sm border backdrop-blur-md"
          style={{
            borderColor: entry.tone.hairline,
            background: `linear-gradient(90deg, color-mix(in oklch, ${accent} 22%, transparent), color-mix(in oklch, ${secondary} 22%, transparent))`,
          }}
        />
        <div className="-mt-12 flex h-12 items-center justify-between px-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70"
            translate="no"
          >
            req
          </span>
          <ArrowRight className="size-4" style={{ color: accent }} aria-hidden="true" />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70"
            translate="no"
          >
            res
          </span>
        </div>
      </div>

      {/* middleware stops above the lane */}
      <div className="absolute inset-x-[5%] top-[10%] flex items-end justify-between gap-2">
        {nodes.map((node, index) => (
          <div
            key={`${node}-${index}`}
            className="relative flex flex-col items-center"
            style={{ width: `${100 / nodes.length}%` }}
          >
            <div
              className="flex w-full flex-col items-center gap-1 rounded-sm border px-2 py-2 backdrop-blur-md"
              style={{
                borderColor: entry.tone.hairline,
                background: `color-mix(in oklch, var(--background) 70%, transparent)`,
              }}
            >
              <span
                className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground"
                translate="no"
              >
                MW·{pad(index + 1)}
              </span>
              <span
                className="max-w-full truncate font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: "color-mix(in oklch, var(--foreground), transparent 15%)" }}
                translate="no"
              >
                {node}
              </span>
            </div>
            {/* drop pin */}
            <div
              className="mt-2 h-6 w-px"
              style={{ background: `color-mix(in oklch, ${accent} 60%, transparent)` }}
              aria-hidden="true"
            />
            <div
              className="size-2 rounded-full border"
              style={{
                borderColor: accent,
                background: entry.tone.chip,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {/* response latency strip below the lane */}
      <div className="absolute inset-x-[5%] top-[70%] flex items-center gap-2 sm:gap-3">
        {Array.from({ length: 24 }).map((_, index) => {
          const seed = sig.charCodeAt(index % sig.length);
          const h = ((seed + index * 7) % 60) + 20; // 20–80
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: pure decoration
              key={index}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}px`,
                background: `linear-gradient(180deg, ${accent}55, transparent)`,
                opacity: 0.75,
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>corridor · {nodes.length} mw</div>
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
