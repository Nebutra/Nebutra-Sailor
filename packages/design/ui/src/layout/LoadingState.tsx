"use client";

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
 * @status stable
 * @planned apps/web dashboard — React Suspense fallback boundaries for async data routes.
 *
 * @example
 * ```tsx
 * <LoadingState message="Fetching projects…" />
 * ```
 */
export function LoadingState({ message, size = "large" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-solid border-[color:var(--blue-9)] border-r-transparent align-[-0.125em]",
          spinnerSize[size],
        )}
        role="status"
        aria-label={message ?? "Loading"}
      />
      {message && (
        <p className="mt-3 text-sm text-[color:var(--neutral-11)] dark:text-white/70">{message}</p>
      )}
    </div>
  );
}
