"use client";

import { usePendingVisible } from "../hooks/use-pending-visible";
import { Spinner } from "../primitives/spinner";
import { cn } from "../utils";

export interface LoadingStateProps {
  /** Message shown below the spinner and used as its accessible status label. */
  message?: string;
  /**
   * Spinner size within the centered loading region.
   * @default "large"
   */
  size?: "small" | "medium" | "large";
}

const spinnerSize = {
  small: 16,
  medium: 24,
  large: 32,
} as const;

/**
 * LoadingState — centred spinner for async content loading.
 *
 * Mounted means pending, so the spinner itself waits
 * interaction.pending.showDelayMs before appearing: a fast load never flashes
 * one. The block keeps its height while it waits, so nothing shifts when it
 * does appear.
 *
 * @status stable
 * @planned apps/web dashboard — React Suspense fallback boundaries for async data routes.
 *
 * @example
 * ```tsx
 * <LoadingState message="Fetching projects…" />
 * ```
 */
export function LoadingState({ message, size = "large" }: LoadingStateProps) {
  const visible = usePendingVisible(true);
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center py-10 transition-opacity duration-flow ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {/* The block already waits out the pending delay, so the spinner paints at once. */}
      <Spinner immediate size={spinnerSize[size]} tone="foreground" label={message ?? "Loading"} />
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
