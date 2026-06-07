"use client";

import type { ManifestLayerStatus } from "@nebutra/startup-os/company-context/model";
import { Gauge, type GaugeSize } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { toPercent } from "./types";

/**
 * CompletenessRing — a thin wrapper over the `Gauge` wheel for floor-row and
 * tower-level completeness. NO hand-rolled SVG: the arc is entirely the Gauge
 * primitive. The numeric percent is rendered as ADJACENT `font-mono` text
 * (precise-tool aesthetic), not inside the gauge, so the ring stays a quiet
 * monochrome arc and the mono digits carry the data.
 */

export interface CompletenessRingProps {
  /** Completeness ratio, 0..1 (clamped + rounded for display). */
  readonly value: number;
  /** Gauge preset size. Defaults to the compact "small" floor-row ring. */
  readonly size?: GaugeSize;
  /** Coarse readiness status — drives the single restrained accent. */
  readonly status?: ManifestLayerStatus;
  /** Show the mono `%` label beside the ring (collapsed-row default). */
  readonly showLabel?: boolean;
  /** Extra classes for the wrapping inline flex row. */
  readonly className?: string;
}

/**
 * Monochrome-first arc color. The single permitted accent (blue) appears only
 * once a layer is fully ready; partial/empty stay neutral so the tower reads
 * calm. This keeps the "monochrome + one accent" rule: blue == done.
 */
function arcColor(status: ManifestLayerStatus | undefined): string {
  return status === "ready" ? "hsl(var(--blue-9))" : "hsl(var(--neutral-8))";
}

export function CompletenessRing({
  value,
  size = "small",
  status,
  showLabel = true,
  className,
}: CompletenessRingProps) {
  const percent = toPercent(value);
  const label = `${percent}% complete`;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Gauge
        value={percent}
        size={size}
        arcPriority="default"
        colors={{ primary: arcColor(status), secondary: "hsl(var(--neutral-4))" }}
        aria-label={label}
      />
      {showLabel ? (
        <span className="font-mono text-xs tabular-nums text-neutral-11">{percent}%</span>
      ) : null}
    </span>
  );
}

CompletenessRing.displayName = "CompletenessRing";
