"use client";

import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../utils/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

/* -------------------------------------------------------------------------- *\
 *  Progress — determinate (or indeterminate) progress bar.
 *
 *  Use cases (per Geist guidance):
 *    File uploads, multi-step setup, build steps, batch deletions — anywhere
 *    the total is knowable. For ~1–3s indeterminate waits use Spinner; for
 *    inline copy like "Saving" use LoadingDots; for quota/ratio use Gauge.
 *
 *  Geist-vs-legacy props:
 *    - `max` is the real ceiling; the bar computes `value / max %` internally
 *      (Geist convention). Don't pre-divide and pass a percentage.
 *    - `type` is the Geist alias for severity: `success | warning | error |
 *      secondary`. The legacy `variant` prop still works for back-compat.
 *    - `colors={{ 0, 25, 50, 75, 100 }}` picks the threshold-band color for
 *      the bar's current % (highest key ≤ pct). Mirror the same breakpoints
 *      used elsewhere (warning at the same threshold a quota note fires).
 *    - `stops` renders dot markers at the given % values with tooltips —
 *      use for genuine multi-stage work (label the stage next to the bar).
 *
 *  A11y:
 *    Base UI sets `role="progressbar"` + `aria-valuemin/max/now` on Root.
 *    We throttle `aria-valuenow` updates to ~1s so screen readers don't
 *    announce every tick of a fast upload.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const progressVariants = cva("relative overflow-hidden rounded-full", {
  variants: {
    variant: {
      default: "bg-primary/20",
      primary: "bg-primary/20",
      secondary: "bg-secondary/20",
      destructive: "bg-destructive/20",
      success: "bg-success/20",
      warning: "bg-warning/20",
      outline: "border border-border bg-transparent",
    },
    size: {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-3",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        primary: "bg-primary",
        secondary: "bg-foreground",
        destructive: "bg-destructive",
        success: "bg-success",
        warning: "bg-warning",
        outline: "bg-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

// Geist `type` → cva `variant` alias
const GEIST_TYPE_TO_VARIANT = {
  success: "success",
  warning: "warning",
  error: "destructive",
  secondary: "secondary",
} as const;

// ---------------------------------------------------------------------------
// Stops + threshold colors
// ---------------------------------------------------------------------------

export interface ProgressStop {
  /** 0–100 percent (or value in `max` units when `valueIsPercent={false}`). */
  value: number;
  tooltip?: React.ReactNode;
  ariaLabel?: string;
}

export type ProgressColorMap = Record<number, string>;

function pickThresholdColor(colors: ProgressColorMap, pct: number): string | undefined {
  // Highest key ≤ pct wins. Keys are sorted ascending so we can iterate.
  const keys = Object.keys(colors)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  let pick: string | undefined;
  for (const k of keys) {
    if (k <= pct) pick = colors[k];
    else break;
  }
  return pick;
}

// ---------------------------------------------------------------------------
// Throttled aria-valuenow
// ---------------------------------------------------------------------------

function useThrottled<T>(value: T, ms = 1000): T {
  const [throttled, setThrottled] = React.useState<T>(value);
  const lastEmit = React.useRef<number>(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const now = Date.now();
    const since = now - lastEmit.current;
    if (since >= ms) {
      lastEmit.current = now;
      setThrottled(value);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastEmit.current = Date.now();
      setThrottled(value);
    }, ms - since);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);

  return throttled;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ProgressProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseProgress.Root>,
  "value" | "max"
> &
  VariantProps<typeof progressVariants> & {
    /** Current value (in `max` units). Pass `null`/omit for indeterminate. */
    value?: number | null;
    /** Real ceiling. @default 100 */
    max?: number;
    /** Geist severity alias — maps to `variant`. */
    type?: "success" | "warning" | "error" | "secondary";
    /** Optional threshold color map keyed by % (e.g. `{ 0, 50, 100 }`). */
    colors?: ProgressColorMap;
    /** Genuine multi-stage stop markers (dots at given % + Tooltip). */
    stops?: ProgressStop[];
    /** Show a numeric `xx%` label below the bar. */
    showValue?: boolean;
    /** Animate fill transitions. @default true */
    animated?: boolean;
    /** Optional caption above the bar. */
    label?: string;
  };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Progress = React.forwardRef<React.ElementRef<typeof BaseProgress.Root>, ProgressProps>(
  function Progress(
    {
      className,
      value = 0,
      max = 100,
      variant,
      type,
      colors,
      stops,
      size,
      showValue = false,
      animated = true,
      label,
      ...props
    },
    ref,
  ) {
    const isIndeterminate = value === undefined || value === null;
    const rawPct = isIndeterminate ? 0 : ((value as number) / max) * 100;
    const pct = Math.min(Math.max(rawPct, 0), 100);
    const throttledPct = useThrottled(pct);

    // Geist `type` wins over legacy `variant` if both passed.
    const resolvedVariant: VariantProps<typeof progressVariants>["variant"] = type
      ? GEIST_TYPE_TO_VARIANT[type]
      : (variant ?? "default");

    const thresholdColor = colors ? pickThresholdColor(colors, pct) : undefined;

    return (
      <div className="w-full space-y-2">
        {label && <div className="text-left font-medium text-foreground text-sm">{label}</div>}
        <div className="relative">
          <BaseProgress.Root
            {...props}
            ref={ref}
            value={isIndeterminate ? null : (value as number)}
            max={max}
            // Throttled aria-valuenow — Base UI reads from valueProp; we
            // override the DOM attr on the same node so AT updates ~1Hz.
            aria-valuenow={isIndeterminate ? undefined : Math.round(throttledPct)}
            className={cn(progressVariants({ variant: resolvedVariant, size }), className)}
          >
            <BaseProgress.Indicator
              className={cn(
                progressIndicatorVariants({
                  variant: resolvedVariant === "outline" ? "default" : resolvedVariant,
                }),
                isIndeterminate && "animate-pulse",
              )}
              style={thresholdColor ? { backgroundColor: thresholdColor } : undefined}
              render={
                <motion.div
                  initial={{ transform: "translateX(-100%)" }}
                  animate={{ transform: `translateX(-${100 - pct}%)` }}
                  transition={{ duration: animated ? 1.2 : 0, ease: "easeInOut" }}
                />
              }
            />
          </BaseProgress.Root>

          {/* Stops — dot markers at given % values, each with an optional tooltip */}
          {stops && stops.length > 0 && (
            <TooltipProvider delayDuration={150}>
              <div className="pointer-events-none absolute inset-0">
                {stops.map((stop, i) => {
                  const stopPct = Math.min(Math.max(stop.value, 0), 100);
                  const reached = pct >= stopPct;
                  return (
                    <Tooltip key={`${stopPct}-${i}`}>
                      <TooltipTrigger asChild>
                        <span
                          aria-label={stop.ariaLabel}
                          aria-hidden={!stop.ariaLabel ? "true" : undefined}
                          className={cn(
                            "pointer-events-auto -translate-x-1/2 -translate-y-1/2 absolute top-1/2 inline-block h-1.5 w-1.5 rounded-full border border-background transition-colors",
                            reached ? "bg-foreground" : "bg-muted-foreground/60",
                          )}
                          style={{ left: `${stopPct}%` }}
                        />
                      </TooltipTrigger>
                      {stop.tooltip && (
                        <TooltipContent side="top" className="text-xs">
                          {stop.tooltip}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>

        {showValue && !isIndeterminate && (
          <motion.div
            className="text-right font-semibold text-muted-foreground text-xs tabular-nums"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animated ? 0.3 : 0, duration: 0.2 }}
          >
            {Math.round(pct)}%
          </motion.div>
        )}
      </div>
    );
  },
);

export { Progress, progressIndicatorVariants, progressVariants };
