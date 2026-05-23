import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Design system specimen — a token spectrum.
 *
 * Top: a wide gradient sweep that runs from brand-primary → brand-accent.
 * Below: 12 stepped swatches representing the radix-style scale, with
 * package nodes annotated as "lineage" callouts.
 */
export function SpectrumSpecimen({ entry, locale, compact = false }: Props) {
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
      aria-label={`${entry.label} token spectrum specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      {/* large gradient sweep */}
      <div
        className="absolute inset-x-[6%] top-[12%] h-[28%] overflow-hidden rounded-sm border"
        style={{ borderColor: entry.tone.hairline }}
      >
        <div
          className="absolute inset-0"
          style={{ background: entry.tone.gradient }}
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 60%, color-mix(in oklch, var(--background) 35%, transparent))",
          }}
        />
        <div className="absolute inset-x-3 bottom-2 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-white/70">
          <span>brand · primary</span>
          <span>brand · accent</span>
        </div>
        <div className="absolute left-3 top-2 font-mono text-[9px] uppercase tracking-[0.32em] text-white/60">
          spectrum · 12 step
        </div>
      </div>

      {/* 12-step scale */}
      <div className="absolute inset-x-[6%] top-[44%] flex h-[8%] items-stretch gap-[2px]">
        {Array.from({ length: 12 }).map((_, index) => {
          const t = index / 11;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: pure positional decoration
              key={index}
              className="relative flex-1 border"
              style={{
                borderColor: "color-mix(in oklch, var(--foreground), transparent 80%)",
                background: `color-mix(in oklch, ${secondary} ${10 + t * 70}%, ${accent} ${(1 - t) * 60}%)`,
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="absolute inset-x-[6%] top-[54%] flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
        <span>01</span>
        <span>06</span>
        <span>12</span>
      </div>

      {/* lineage callouts */}
      <div className="absolute inset-x-[6%] bottom-[12%] grid grid-cols-2 gap-2 sm:grid-cols-3">
        {nodes.map((node, index) => (
          <div
            key={`${node}-${index}`}
            className="flex items-center gap-2 rounded-sm border px-3 py-2 backdrop-blur-md"
            style={{
              borderColor: entry.tone.hairline,
              background: `color-mix(in oklch, var(--background) 70%, transparent)`,
            }}
          >
            <span
              className="size-3 shrink-0 rounded-sm border"
              style={{
                background: `color-mix(in oklch, ${accent} ${30 + index * 12}%, ${secondary})`,
                borderColor: entry.tone.hairline,
              }}
              aria-hidden="true"
            />
            <span
              className="truncate font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ color: "color-mix(in oklch, var(--foreground), transparent 15%)" }}
              translate="no"
            >
              {node}
            </span>
          </div>
        ))}
      </div>

      {/* corner annotations */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>spectrum · DTCG</div>
            <div className="mt-1 text-foreground/40">sig {sig}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "供应链 token" : "token supply chain"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
