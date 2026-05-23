import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Commerce specimen — a ledger of metered events.
 *
 * Each row = one billable event/contract. The fake amounts and the
 * meter gauge on the right are decorative-but-consistent (signature
 * pinned to the slug so the layout is stable across reloads).
 */
export function LedgerSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 7);
  const accent = entry.tone.accent;
  const secondary = entry.tone.secondary;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  // deterministic amounts derived from signature
  const amountFor = (index: number) => {
    const code = sig.charCodeAt(index % sig.length) + index * 13;
    return (code % 9000) + 1000;
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} ledger specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 100% 50%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* ledger header */}
      <div
        className="absolute inset-x-[6%] top-[8%] flex items-center justify-between border-b pb-2"
        style={{ borderColor: entry.tone.hairline }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
            translate="no"
          >
            ledger
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: accent }}
            translate="no"
          >
            {entry.slug.toUpperCase()}
          </span>
        </div>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
          translate="no"
        >
          {locale === "zh" ? "用量 / 计费" : "usage / billing"}
        </span>
      </div>

      {/* rows */}
      <div className="absolute inset-x-[6%] top-[18%] bottom-[18%] flex flex-col gap-1">
        {nodes.map((node, index) => {
          const amount = amountFor(index);
          const pulse = (amount % 80) + 10; // 10–90 percent
          const tint = index % 2 === 0 ? accent : secondary;
          return (
            <div
              key={`${node}-${index}`}
              className="relative flex flex-1 items-center justify-between gap-3 border-b px-1 last:border-b-0"
              style={{ borderColor: "color-mix(in oklch, var(--foreground), transparent 88%)" }}
            >
              <div className="flex flex-1 items-center gap-3">
                <span
                  className="w-8 font-mono text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground"
                  translate="no"
                >
                  {pad(index + 1, 3)}
                </span>
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: tint }}
                  aria-hidden="true"
                />
                <span
                  className="truncate font-mono text-[12px] uppercase tracking-[0.08em]"
                  style={{ color: "color-mix(in oklch, var(--foreground), transparent 12%)" }}
                  translate="no"
                >
                  {node}
                </span>
              </div>

              {/* pulse meter bar */}
              <div
                className="hidden h-2 flex-1 max-w-[40%] overflow-hidden rounded-full border sm:block"
                style={{ borderColor: entry.tone.hairline }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${pulse}%`,
                    background: `linear-gradient(90deg, ${tint}, color-mix(in oklch, ${tint}, white 18%))`,
                  }}
                  aria-hidden="true"
                />
              </div>

              <span
                className="w-24 text-right font-mono text-[11px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground"
                translate="no"
              >
                ${amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* footer */}
      {!compact ? (
        <div className="pointer-events-none absolute inset-x-[6%] bottom-[6%] flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <div>
              {nodes.length} rows · sig {sig}
            </div>
            <div className="mt-1 text-foreground/40">
              {locale === "zh" ? "用量计量" : "metered usage"}
            </div>
          </div>
          <div
            className="font-mono text-[14px] uppercase tracking-[0.32em]"
            style={{ color: accent }}
            translate="no"
          >
            Σ $
            {nodes
              .map((_, i) => amountFor(i))
              .reduce((a, b) => a + b, 0)
              .toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
