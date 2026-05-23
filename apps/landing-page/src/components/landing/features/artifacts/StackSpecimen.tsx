import { Database, Layers, Servers, SettingsGear, Shield } from "@nebutra/icons";
import {
  type DisplayCardProps,
  DisplayCards,
  DotPattern,
  MetricCard,
  Progress,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

const STRATA_ICONS: ReactNode[] = [
  <Layers key="layers" className="size-4 text-blue-300" />,
  <Servers key="servers" className="size-4 text-blue-300" />,
  <Database key="db" className="size-4 text-blue-300" />,
  <Shield key="shield" className="size-4 text-blue-300" />,
  <SettingsGear key="gear" className="size-4 text-blue-300" />,
];

const STACK_CARD_POSITIONS = [
  "[grid-area:stack] hover:-translate-y-8 before:absolute before:w-full before:rounded-[var(--radius-xl)] before:outline-1 before:outline-border before:h-full before:content-[''] before:bg-background/60 before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[100%] hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-12 translate-y-6 hover:-translate-y-2 before:absolute before:w-full before:rounded-[var(--radius-xl)] before:outline-1 before:outline-border before:h-full before:content-[''] before:bg-background/50 before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[60%] hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-24 translate-y-12 hover:translate-y-6",
] as const;

/**
 * Platform specimen — stratified control plane rendered through real
 * `@nebutra/ui/primitives`:
 *   - `DotPattern` background
 *   - `DisplayCards` for the hero stacked-strata visual
 *   - `MetricCard` + `Progress` for the per-layer depth rail (non-compact)
 *
 * Layers run top→bottom from highest abstraction (L06) to lowest shared (L01).
 * `entrySignature` deterministically chooses one layer to highlight so two
 * sibling pages render distinctly without claiming live telemetry.
 */
export function StackSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 6);
  const sig = entrySignature(entry);
  const highlightIndex = Number.parseInt(sig.slice(-1), 16) % Math.max(nodes.length, 1);

  // Build the top-3 strata cards consumed by `DisplayCards`.
  const stratumCards: DisplayCardProps[] = nodes.slice(0, 3).map((node, index) => {
    const layerNumber = nodes.length - index;
    return {
      className: STACK_CARD_POSITIONS[index] ?? STACK_CARD_POSITIONS[2],
      icon: STRATA_ICONS[index] ?? STRATA_ICONS[0],
      title: node,
      description: locale === "zh" ? `L${pad(layerNumber)} 层` : `Layer L${pad(layerNumber)}`,
      date: `sig ${sig}`,
      titleClassName: index === 0 ? "text-blue-400" : "text-foreground/80",
    };
  });

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
      <DotPattern
        glow={!compact}
        className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] text-foreground/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${entry.tone.halo}, transparent 65%)`,
        }}
      />

      {/* Stratum hero — DisplayCards stack */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-6 pt-8 pb-4">
          <DisplayCards
            cards={stratumCards}
            className="opacity-100 [&>div]:h-28 [&>div]:w-[18rem]"
          />
        </div>

        {/* Depth rail — per-layer MetricCard + Progress */}
        {!compact ? (
          <div className="border-border/30 border-t bg-background/40 px-6 py-3 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
              {nodes.map((node, index) => {
                const depth = Math.round(100 - (index / Math.max(nodes.length - 1, 1)) * 60);
                const isHighlight = index === highlightIndex;
                return (
                  <div key={`${node}-${index}`} className="flex flex-col gap-1">
                    <MetricCard
                      size="sm"
                      label={`L${pad(nodes.length - index)} · ${node}`}
                      value={`${depth}%`}
                      trend={isHighlight ? "up" : "neutral"}
                      trendValue={isHighlight ? "live" : undefined}
                    />
                    <Progress
                      value={depth}
                      max={100}
                      size="sm"
                      variant={isHighlight ? "primary" : "outline"}
                      animated={false}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              <span>
                stack · {nodes.length} strata · sig {sig}
              </span>
              <span>{locale === "zh" ? "最低共享层" : "lowest shared layer"}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
