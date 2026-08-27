"use client";

import { Cloud, Globe, Servers, Warning } from "@nebutra/icons";
import { DashboardMetricTile } from "@nebutra/ui/patterns";
import type { ComponentType } from "react";

/**
 * Metric tiles for the Fleet page.
 *
 * This is a client component so the icon components stay inside the client
 * graph. `@nebutra/icons` ships without a "use client" banner, so a server
 * component cannot pass an icon into `DashboardMetricTile` (itself a client
 * component) — React refuses to serialize the forwardRef across the boundary.
 * The server page therefore hands over plain data and names an icon by key.
 */

export type FleetMetricIcon = "globe" | "cloud" | "servers" | "warning";

// Annotated rather than inferred: the icon components resolve through a nested
// node_modules path that TypeScript cannot name portably (TS2742).
type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const ICONS: Record<FleetMetricIcon, IconComponent> = {
  globe: Globe,
  cloud: Cloud,
  servers: Servers,
  warning: Warning,
};

export interface FleetMetric {
  label: string;
  value: string;
  detail: string;
  icon: FleetMetricIcon;
  tone: "neutral" | "blue" | "green" | "amber";
}

export function FleetMetrics({ metrics }: { metrics: FleetMetric[] }) {
  return (
    <div className="mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <DashboardMetricTile
          key={metric.label}
          label={metric.label}
          value={metric.value}
          detail={metric.detail}
          icon={ICONS[metric.icon]}
          tone={metric.tone}
        />
      ))}
    </div>
  );
}
