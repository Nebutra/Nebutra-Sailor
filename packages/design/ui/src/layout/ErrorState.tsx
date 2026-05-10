"use client";

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error detail or message */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
}

/**
 * ErrorState — inline error display with optional retry action.
 *
 * @status stable
 * @planned apps/web dashboard — React Error Boundary fallback, failed fetch/mutation states.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load projects"
 *   message={error.message}
 *   onRetry={refetch}
 * />
 * ```
 */
export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="px-4 py-6">
      <div
        role="alert"
        className="rounded-md border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.12)] p-4 text-[hsl(var(--destructive-foreground))]"
      >
        <p className="font-semibold">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-[hsl(var(--destructive-foreground)/0.9)]">{message}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-[hsl(var(--destructive)/0.2)] px-3 py-1.5 text-sm font-medium text-[hsl(var(--destructive-foreground))] transition-colors hover:bg-[hsl(var(--destructive)/0.28)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--destructive)/0.5)] focus:ring-offset-1 focus:ring-offset-[hsl(var(--background))]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
