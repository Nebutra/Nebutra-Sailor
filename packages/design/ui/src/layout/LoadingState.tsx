"use client";

import { usePendingVisible } from "../hooks/use-pending-visible";
import { cn } from "../utils";

export interface LoadingStateProps {
  /** Optional message shown below the spinner */
  message?: string;
  /** Size of the spinner */
  size?: "small" | "medium" | "large";
}

const spinnerSize = {
  small: "h-4 w-4 border-2",
  medium: "h-6 w-6 border-2",
  large: "h-8 w-8 border-4",
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
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-solid border-primary border-r-transparent align-[-0.125em]",
          spinnerSize[size],
        )}
        role="status"
        aria-label={message ?? "Loading"}
      />
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
