import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Integrations specimen — a horizontal bus with plug-in ports.
 *
 * Each port = one integration (queue, search, webhook, email, ...).
 * Event pulses are static "·" markers above the bus to suggest traffic
 * without animating (mostly).
 */
export function BusSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 7);
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
      aria-label={`${entry.label} integration bus specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${entry.tone.halo}, transparent 60%)`,
        }}
      />

      {/* upper event stream */}
      <div className="absolute inset-x-10 top-[28%]">
        <div className="flex items-center justify-between gap-2">
          {nodes.map((_node, index) => (
            <div
              key={`pulse-${index}`}
              className="h-2 flex-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${
                  index % 2 === 0 ? accent : secondary
                }66, transparent)`,
                opacity: 0.7,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
          <span>{locale === "zh" ? "事件流" : "event stream"}</span>
          <span>txns / s</span>
        </div>
      </div>

      {/* central bus line */}
      <div className="absolute inset-x-0 top-[50%] flex -translate-y-1/2 flex-col items-center">
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, ${secondary}, transparent)`,
          }}
          aria-hidden="true"
        />
        <div
          className="-mt-px h-[2px] w-[88%]"
          style={{ background: `${accent}` }}
          aria-hidden="true"
        />
      </div>

      {/* ports below the bus */}
      <div className="absolute inset-x-6 top-[52%] flex items-start justify-between gap-2 sm:gap-3">
        {nodes.map((node, index) => (
          <div key={`${node}-${index}`} className="relative flex flex-1 flex-col items-center">
            {/* drop connector */}
            <div
              className="h-6 w-px"
              style={{ background: `color-mix(in oklch, ${accent} 60%, transparent)` }}
              aria-hidden="true"
            />
            {/* plug head */}
            <div
              className="flex size-3 -translate-y-px items-center justify-center rounded-full border"
              style={{
                borderColor: accent,
                background: entry.tone.chip,
              }}
              aria-hidden="true"
            />
            {/* port label */}
            <div
              className="mt-3 flex w-full flex-col items-center gap-1 rounded-sm border px-2 py-2 backdrop-blur-md"
              style={{
                borderColor: entry.tone.hairline,
                background: `color-mix(in oklch, var(--background) 70%, transparent)`,
              }}
            >
              <span
                className="max-w-full truncate font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: "color-mix(in oklch, var(--foreground), transparent 15%)" }}
                translate="no"
              >
                {node}
              </span>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground"
                translate="no"
              >
                :{pad(8080 + index, 4)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* corner annotations */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>bus · {nodes.length} ports</div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "可替换连接层" : "swappable integration layer"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
