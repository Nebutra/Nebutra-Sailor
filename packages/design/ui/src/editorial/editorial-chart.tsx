import type { CSSProperties } from "react";
import { cn } from "../utils/cn";
import {
  EDITORIAL_CAPTION,
  EDITORIAL_EYEBROW,
  editorialBlock,
  editorialFrame,
} from "./editorial-surface";

export type EditorialChartPoint = {
  /** Optional per-point display string. Falls back to the raw value. */
  display?: string | null;
  key?: string;
  label: string;
  value: number;
};

export type EditorialChartProps = {
  caption?: string | null;
  className?: string;
  label?: string;
  points: EditorialChartPoint[];
  title?: string | null;
  variant?: "bar" | "line";
};

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 200;

function formatPoint(point: EditorialChartPoint): string {
  return point.display ?? String(point.value);
}

/**
 * Horizontal bars.
 *
 * Laid out with grid and percentage widths rather than SVG: an article column
 * is narrow and reflows, and a CSS bar keeps its labels selectable, wrappable
 * and readable by assistive tech without a parallel text description.
 */
function BarChart({ points, max }: { max: number; points: EditorialChartPoint[] }) {
  return (
    <div className="grid gap-3">
      {points.map((point, index) => {
        // A bar with a real zero width is invisible, so the floor keeps the
        // smallest value legible as a value rather than as an empty track.
        const share = max > 0 ? Math.max((point.value / max) * 100, 1.5) : 0;

        return (
          <div
            key={point.key ?? `${index}-${point.label}`}
            className="grid grid-cols-[minmax(5rem,9rem)_1fr_auto] items-center gap-3"
          >
            <span className="truncate text-sm text-muted-foreground" title={point.label}>
              {point.label}
            </span>
            <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
              {/* The measured width travels as a custom property so the class,
                  not the element, still owns the `width` declaration. */}
              <span
                className="block h-full w-[var(--editorial-bar)] rounded-full bg-primary"
                style={{ "--editorial-bar": `${share}%` } as CSSProperties}
              />
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatPoint(point)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Trend line.
 *
 * SVG is the right tool once the shape between points carries the meaning. The
 * `viewBox` scales to the container, so no measurement pass and no client
 * JavaScript is required.
 */
function LineChart({ max, points }: { max: number; points: EditorialChartPoint[] }) {
  const step = points.length > 1 ? VIEWBOX_WIDTH / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = points.length > 1 ? index * step : VIEWBOX_WIDTH / 2;
    const y = VIEWBOX_HEIGHT - (max > 0 ? (point.value / max) * (VIEWBOX_HEIGHT - 16) : 0) - 8;
    return { x, y };
  });
  const path = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg
        aria-hidden
        className="h-40 w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <title>Trend</title>
        <path
          d={`${path} L${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L0 ${VIEWBOX_HEIGHT} Z`}
          // `--primary` is bare HSL channels; an SVG paint slot needs a colour.
          fill="color-mix(in srgb, hsl(var(--primary)) 10%, transparent)"
        />
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-3 flex justify-between gap-2">
        {points.map((point, index) => (
          <div key={point.key ?? `${index}-${point.label}`} className="min-w-0 text-center">
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatPoint(point)}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{point.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Small inline data figure.
 *
 * Values are also emitted as a visually hidden table, so the chart is readable
 * without sight of the bars and copyable as data rather than as an image.
 */
export function EditorialChart({
  caption,
  className,
  label,
  points,
  title,
  variant = "bar",
}: EditorialChartProps) {
  const visible = points.filter((point) => point.label.trim() && Number.isFinite(point.value));
  if (!visible.length) return null;

  const max = Math.max(...visible.map((point) => point.value), 0);

  return (
    <figure className={cn(editorialBlock({ spacing: "loose", width: "breakout" }), className)}>
      <div className={cn(editorialFrame({ elevation: "resting" }), "px-5 py-5 sm:px-6")}>
        {(label || title) && (
          <div className="mb-5">
            {label && <div className={EDITORIAL_EYEBROW}>{label}</div>}
            {title && (
              <h3 className="mt-2 text-base font-semibold leading-6 text-foreground">{title}</h3>
            )}
          </div>
        )}
        {variant === "line" ? (
          <LineChart max={max} points={visible} />
        ) : (
          <BarChart max={max} points={visible} />
        )}
        <table className="sr-only">
          <caption>{title ?? label ?? "Chart data"}</caption>
          <tbody>
            {visible.map((point, index) => (
              <tr key={point.key ?? `${index}-${point.label}`}>
                <th scope="row">{point.label}</th>
                <td>{formatPoint(point)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className={cn("mt-3", EDITORIAL_CAPTION)}>{caption}</figcaption>}
    </figure>
  );
}
