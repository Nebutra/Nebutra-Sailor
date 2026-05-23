"use client";

import { Check, LockClosed, ShieldCheck } from "@nebutra/icons";
import { BorderTrail, DotPattern, MagicCard, StatusDot } from "@nebutra/ui/primitives";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

/**
 * Identity & trust specimen — a "trust corridor" of gates.
 *
 * Each gate is rendered as a {@link MagicCard} (hover spotlight). One gate is
 * picked deterministically per entry (via {@link entrySignature}) and wrapped
 * with {@link BorderTrail} to signal the actively-being-validated gate.
 *
 * Compact mode disables the trail (animation is overkill at 96px height) and
 * drops the corner annotations.
 */
export function CorridorSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = compact ? getSpecimenNodes(entry, 4) : getSpecimenNodes(entry, 5);
  const sig = entrySignature(entry);
  const accent = entry.tone.accent;
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  // Active-gate index — picked from the entry signature so siblings differ but
  // the same slug always lights the same gate.
  const activeIndex = parseInt(sig.slice(0, 2), 16) % nodes.length;

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`${entry.label} trust corridor specimen`}
      style={minHeightStyle}
    >
      <DotPattern
        className="text-foreground/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
        width={20}
        height={20}
        cr={0.9}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      {/* corridor — hairline rails + row of gates */}
      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
        <div className="h-px w-full bg-foreground/10" aria-hidden="true" />
        <div
          className={`grid gap-3 ${compact ? "py-3" : "py-6"}`}
          style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))` }}
        >
          {nodes.map((node, index) => {
            const GateIcon = index % 2 === 0 ? LockClosed : ShieldCheck;
            const isActive = index === activeIndex;
            return (
              <div key={`${node}-${index}`} className="relative rounded-md">
                <MagicCard
                  className={compact ? "rounded-md" : "rounded-md"}
                  gradientSize={compact ? 140 : 200}
                  gradientOpacity={0.6}
                >
                  <div
                    className={`relative flex flex-col items-center gap-2 rounded-md ${
                      compact ? "px-2 py-3" : "px-3 py-4"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center rounded-sm border border-foreground/10 bg-background/60 backdrop-blur-sm ${
                        compact ? "size-7" : "size-9"
                      }`}
                    >
                      <GateIcon
                        className={compact ? "size-3.5" : "size-4"}
                        style={{ color: accent }}
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className={`max-w-full truncate font-mono uppercase tracking-[0.12em] text-foreground/70 ${
                        compact ? "text-[9px]" : "text-[10px]"
                      }`}
                      translate="no"
                    >
                      {node}
                    </span>

                    {!compact ? (
                      <div className="flex items-center gap-1.5">
                        <StatusDot
                          state={isActive ? "BUILDING" : "READY"}
                          decorative
                          titlePrefix={`${entry.label} gate ${pad(index + 1)}`}
                        />
                        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
                          G·{pad(index + 1)}
                        </span>
                      </div>
                    ) : (
                      <Check className="size-3 text-foreground/40" aria-hidden="true" />
                    )}
                  </div>
                </MagicCard>

                {isActive && !compact ? (
                  <BorderTrail
                    size={72}
                    className="bg-[color:var(--brand-primary)]"
                    style={{
                      filter: "blur(2px)",
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="h-px w-full bg-foreground/10" aria-hidden="true" />
      </div>

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
