import { createMap } from "piri";
import * as React from "react";

import { cn } from "../utils/cn";

export interface DottedMapMarker {
  lat: number;
  lng: number;
  size?: number;
}

export interface DottedMapProps extends React.SVGProps<SVGSVGElement> {
  /** Width of the SVG map */
  width?: number;
  /** Height of the SVG map */
  height?: number;
  /** Number of sample points for map generation */
  mapSamples?: number;
  /** Array of markers to display on the map */
  markers?: DottedMapMarker[];
  /** Color of the map dots (uses currentColor if not set) */
  dotColor?: string;
  /** Color of the markers */
  markerColor?: string;
  /** Radius of the map dots */
  dotRadius?: number;
  /** Enable stagger offset for alternating rows */
  stagger?: boolean;
}

/**
 * DottedMap - SVG world map with dots and markers
 *
 * @description
 * Renders a world map using dots, with support for custom markers.
 * Perfect for showing global presence, office locations, or user distribution.
 *
 * @example Basic usage
 * ```tsx
 * <div className="h-[400px] w-full">
 *   <DottedMap />
 * </div>
 * ```
 *
 * @example With markers
 * ```tsx
 * <DottedMap
 *   markers={[
 *     { lat: 40.7128, lng: -74.006 },  // New York
 *     { lat: 51.5074, lng: -0.1278 },  // London
 *     { lat: 35.6762, lng: 139.6503 }, // Tokyo
 *   ]}
 *   markerColor="#FF6900"
 * />
 * ```
 *
 * @example Smaller dots
 * ```tsx
 * <DottedMap dotRadius={0.15} mapSamples={8000} />
 * ```
 */
export function DottedMap({
  width = 150,
  height = 75,
  mapSamples = 5000,
  markers = [],
  markerColor = "#FF6900",
  dotRadius = 0.2,
  stagger = true,
  className,
  style,
}: DottedMapProps) {
  const { points, addMarkers } = createMap({
    width,
    height,
    mapSamples,
  });

  const processedMarkers = addMarkers(markers as Parameters<typeof addMarkers>[0]);

  // Compute stagger helpers in a single, simple pass
  const { xStep, yToRowIndex } = React.useMemo(() => {
    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const rowMap = new Map<number, number>();
    let step = 0;
    let prevY = Number.NaN;
    let prevXInRow = Number.NaN;

    for (const p of sorted) {
      if (p.y !== prevY) {
        // new row
        prevY = p.y;
        prevXInRow = Number.NaN;
        if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size);
      }
      if (!Number.isNaN(prevXInRow)) {
        const delta = p.x - prevXInRow;
        if (delta > 0) step = step === 0 ? delta : Math.min(step, delta);
      }
      prevXInRow = p.x;
    }

    return { xStep: step || 1, yToRowIndex: rowMap };
  }, [points]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-muted-foreground", className)}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {points.map((point, index) => {
        const rowIndex = yToRowIndex.get(point.y) ?? 0;
        const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
        return (
          <circle
            cx={point.x + offsetX}
            cy={point.y}
            r={dotRadius}
            fill="currentColor"
            key={`${point.x}-${point.y}-${index}`}
          />
        );
      })}
      {processedMarkers.map((marker, index) => {
        const rowIndex = yToRowIndex.get(marker.y) ?? 0;
        const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
        return (
          <circle
            cx={marker.x + offsetX}
            cy={marker.y}
            r={(marker.size as number | undefined) ?? dotRadius}
            fill={markerColor}
            key={`marker-${marker.x}-${marker.y}-${index}`}
          />
        );
      })}
    </svg>
  );
}
