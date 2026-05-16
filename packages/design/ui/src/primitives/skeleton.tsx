"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Skeleton — loading placeholder.
 *
 *  Use cases (per Geist guidance):
 *    Async data that fills a known layout: table rows, card grids, profile
 *    blocks, sidebars. For a single in-flight action use Spinner; for an
 *    indeterminate inline wait use LoadingDots; for known progress use
 *    Progress. Skeleton is NOT a permanent decoration or empty-state filler.
 *
 *  API surface:
 *    Two control axes:
 *      - Sizing: `width` / `height` / `boxHeight` (px or CSS length). When
 *        children are passed and no sizing props are set, the skeleton sizes
 *        itself to wrap children (invisible) — the layout stays stable
 *        across the loading→loaded swap.
 *      - Shape: `pill` (fully rounded) / `rounded` (radius-md) / `squared`
 *        (radius-sm). Pick to mirror the eventual element's shape.
 *
 *  Visibility — `show` vs `isLoaded`:
 *    `show={false}` renders children unwrapped (the loaded state). The legacy
 *    `isLoaded` prop still works but is deprecated. Don't pass both.
 *
 *  A11y:
 *    - While visible: `aria-busy="true"` + `aria-hidden="true"` on the
 *      placeholder, so the loading region announces busy without leaking
 *      placeholder geometry to screen readers.
 *    - Children passed for shape stay in the DOM as `invisible` + `inert`
 *      + `aria-hidden` so focusable controls don't leak via Tab.
 *    - `motion-reduce:animate-none` honors prefers-reduced-motion.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Width in px (number) or any CSS length (string). */
  width?: number | string;
  /** Height in px (number) or any CSS length (string). */
  height?: number | string;
  /** Outer wrapper height — keeps surrounding layout from reflowing. */
  boxHeight?: number | string;
  /** Pill shape — fully rounded. Mutually exclusive with `rounded`/`squared`. */
  pill?: boolean;
  /** Rounded shape — radius-md. */
  rounded?: boolean;
  /** Squared shape — radius-sm. */
  squared?: boolean;
  /** Animate the shimmer. @default true */
  animated?: boolean;
  /**
   * Show the placeholder. When `false` and children are passed, the children
   * render unwrapped (loaded state). @default true
   */
  show?: boolean;
  /** Optional children — when present, the skeleton sizes itself to wrap them. */
  children?: ReactNode;
  /** @deprecated Use `show={!isLoaded}` instead. */
  isLoaded?: boolean;
  /** @deprecated Use `animated={false}` instead. */
  disableAnimation?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function shapeRadiusClass(props: SkeletonProps): string {
  if (props.pill) return "rounded-full";
  if (props.squared) return "rounded-[var(--radius-sm)]";
  // `rounded` and the default both render the canonical Skeleton radius.
  return "rounded-[var(--radius-md)]";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Skeleton(props: SkeletonProps) {
  const {
    width,
    height,
    boxHeight,
    pill: _pill,
    rounded: _rounded,
    squared: _squared,
    animated: animatedProp,
    show: showProp,
    children,
    isLoaded,
    disableAnimation,
    className,
    style,
    ...rest
  } = props;

  // Resolve deprecated aliases. `show` wins if explicitly set; otherwise
  // derive from legacy `isLoaded`.
  const show = showProp !== undefined ? showProp : !isLoaded;
  const animated = animatedProp !== undefined ? animatedProp : !disableAnimation;

  // Loaded path: render children unwrapped. Geist's rule is "Don't use
  // Skeleton as permanent decoration" — once data lands, get out of the way.
  if (!show && children) {
    return <>{children}</>;
  }

  const sizeStyle: CSSProperties = {
    width: asCssLength(width),
    height: asCssLength(height),
    minHeight: asCssLength(boxHeight),
  };

  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      data-loaded={!show}
      className={cn(
        "bg-muted",
        shapeRadiusClass(props),
        animated && "animate-pulse motion-reduce:animate-none",
        className,
      )}
      style={{ ...sizeStyle, ...style }}
      {...rest}
    >
      {/* Children passed for shape — kept invisible + inert so focusable
          controls don't leak via Tab and don't get announced. */}
      {children && (
        // biome-ignore lint/a11y/useSemanticElements: this <div> isn't a landmark; `inert` is the relevant a11y signal.
        <div className="invisible" inert aria-hidden="true">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-built variants — common layouts to avoid copy-paste arithmetic
// ---------------------------------------------------------------------------

export function SkeletonText({
  lines = 3,
  className,
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={cn(i === lines - 1 ? "w-[60%]" : i === 0 ? "w-full" : "w-[80%]")}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = "md",
  className,
  ...props
}: SkeletonProps & { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  return <Skeleton pill width={px} height={px} className={className} {...props} />;
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-4 p-4", className)} {...props}>
      <Skeleton height={128} className="w-full" />
      <div className="space-y-2">
        <Skeleton height={16} className="w-3/4" />
        <Skeleton height={16} className="w-1/2" />
      </div>
    </div>
  );
}
