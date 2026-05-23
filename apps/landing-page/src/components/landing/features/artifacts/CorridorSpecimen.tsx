import { Check, LockClosed, ShieldCheck } from "@nebutra/icons";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Identity & trust specimen — a gated corridor.
 *
 * Verticals columns = identity gates (auth, audit, vault, permissions).
 * Each gate has a small badge stamp. Status pips on the left signal
 * "verified" / "challenge" passes — they are decorative, not real-time.
 */
export function CorridorSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 6);
  const accent = entry.tone.accent;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "260px" }
    : { minHeight: "clamp(420px, 60vw, 600px)" };

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} trust corridor specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      {/* corridor floor */}
      <div className="absolute inset-x-6 bottom-12 top-12 flex items-stretch">
        {/* ceiling/floor rails */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }}
          aria-hidden="true"
        />

        {/* gate columns */}
        <div className="relative flex flex-1 items-stretch justify-between gap-3">
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1;
            return (
              <div
                key={`${node}-${index}`}
                className="relative flex flex-1 flex-col items-center justify-between py-3"
              >
                {/* upper badge stamp */}
                <div
                  className="flex size-7 items-center justify-center rounded-sm border"
                  style={{
                    borderColor: entry.tone.hairline,
                    background: entry.tone.chip,
                    color: accent,
                  }}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                </div>

                {/* vertical column */}
                <div
                  className="my-2 w-px flex-1"
                  style={{
                    background: `linear-gradient(180deg, ${accent}66, transparent 80%, ${accent}66)`,
                  }}
                  aria-hidden="true"
                />

                {/* gate label */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="flex size-9 items-center justify-center rounded-sm border backdrop-blur-md"
                    style={{
                      borderColor: entry.tone.hairline,
                      background: `color-mix(in oklch, var(--background) 70%, transparent)`,
                    }}
                  >
                    {index % 2 === 0 ? (
                      <LockClosed className="size-4" style={{ color: accent }} aria-hidden="true" />
                    ) : (
                      <ShieldCheck
                        className="size-4"
                        style={{ color: accent }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span
                    className="max-w-[6rem] truncate font-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: "color-mix(in oklch, var(--foreground), transparent 20%)" }}
                    translate="no"
                  >
                    {node}
                  </span>
                </div>

                {/* numeric stamp */}
                <span
                  className="mt-2 font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground"
                  translate="no"
                >
                  G·{pad(index + 1)}
                </span>

                {/* arch separator */}
                {!isLast ? (
                  <div
                    aria-hidden="true"
                    className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full"
                    style={{ background: `color-mix(in oklch, ${accent} 35%, transparent)` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* corner annotations */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>corridor · {nodes.length} gates</div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "信任通廊 / 审计" : "trust corridor / audit"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
