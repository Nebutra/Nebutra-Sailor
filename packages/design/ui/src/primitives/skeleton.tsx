"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

/**
 * Props for the Skeleton component
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether content is loaded (stops animation, shows children) */
  isLoaded?: boolean;
  /** Disable the shimmer animation */
  disableAnimation?: boolean;
}

/**
 * Skeleton - Loading placeholder component
 *
 * A placeholder to show loading state. Can wrap children to take their
 * shape, or be used standalone with custom dimensions.
 *
 * @example Basic standalone
 * ```tsx
 * <Skeleton className="h-4 w-[200px]" />
 * ```
 *
 * @example Multiple lines
 * ```tsx
 * <div className="space-y-2">
 *   <Skeleton className="h-4 w-full" />
 *   <Skeleton className="h-4 w-[80%]" />
 *   <Skeleton className="h-4 w-[60%]" />
 * </div>
 * ```
 *
 * @example Avatar and text
 * ```tsx
 * <div className="flex items-center gap-4">
 *   <Skeleton className="h-12 w-12 rounded-full" />
 *   <div className="space-y-2">
 *     <Skeleton className="h-4 w-[150px]" />
 *     <Skeleton className="h-4 w-[100px]" />
 *   </div>
 * </div>
 * ```
 *
 * @example Card skeleton
 * ```tsx
 * <div className="p-4 border rounded-[var(--radius-lg)] space-y-4">
 *   <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
 *   <div className="space-y-2">
 *     <Skeleton className="h-4 w-3/4" />
 *     <Skeleton className="h-4 w-1/2" />
 *   </div>
 * </div>
 * ```
 *
 * @example With loaded state
 * ```tsx
 * const [isLoaded, setIsLoaded] = useState(false);
 *
 * <Skeleton isLoaded={isLoaded} className="h-24 w-24 rounded-[var(--radius-lg)]">
 *   <img src="/avatar.jpg" alt="Avatar" />
 * </Skeleton>
 * ```
 *
 * @example Wrapping children
 * ```tsx
 * <Skeleton>
 *   <div className="h-24 w-24 rounded-full" />
 * </Skeleton>
 * ```
 */
export function Skeleton({
  className,
  children,
  isLoaded = false,
  disableAnimation = false,
  ...props
}: SkeletonProps) {
  if (isLoaded && children) {
    return <>{children}</>;
  }

  return (
    <div
      data-loaded={isLoaded}
      className={cn(
        "bg-muted rounded-[var(--radius-md)]",
        !disableAnimation && "animate-pulse",
        className,
      )}
      {...props}
    >
      {/* Hidden children to maintain shape */}
      {children && <div className="invisible">{children}</div>}
    </div>
  );
}

/**
 * Pre-built skeleton variants for common use cases
 */
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
          className={cn("h-4", i === lines - 1 ? "w-[60%]" : i === 0 ? "w-full" : "w-[80%]")}
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
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} {...props} />;
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-4 p-4", className)} {...props}>
      <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
