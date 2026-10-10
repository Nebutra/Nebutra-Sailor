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
 *   markerColor="hsl(var(--primary))"
 * />
 * ```
 *
 * @example Smaller dots
 * ```tsx
 * <DottedMap dotRadius={0.15} mapSamples={8000} />
 * ```
 */
/** Two decimals, no trailing zeros: the path's coordinates. */
function round2(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function DottedMap({
  width = 150,
  height = 75,
  mapSamples = 5000,
  markers = [],
  markerColor = "hsl(var(--primary))",
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

  const dotsPath = points
    .map((point) => {
      const rowIndex = yToRowIndex.get(point.y) ?? 0;
      const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
      return `M${round2(point.x + offsetX)} ${round2(point.y)}h0`;
    })
    .join("");

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-muted-foreground", className)}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {/*
        One path, not a <circle> per dot: every dot is a zero-length subpath
        drawn with a round cap as wide as the dot (stroke-width = 2r), which
        paints the same disc. A server-rendered map is markup twice over — in
        the HTML and again in the RSC payload — and 2,600 circles with
        full-precision coordinates were ~80 KB of each on /investors; this is
        ~12 bytes a dot. Coordinates keep two decimals, a hundredth of a
        viewBox unit (sub-pixel at any size the map is drawn).
      */}
      <path
        d={dotsPath}
        fill="none"
        stroke="currentColor"
        strokeWidth={dotRadius * 2}
        strokeLinecap="round"
      />
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
