"use client";

import { Error as ErrorSurface } from "../primitives/error-message";

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error detail or message */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Stable request, trace, deployment, or run identifier */
  errorId?: string;
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
export function ErrorState({
  title = "Couldn’t Load Resource",
  message,
  onRetry,
  errorId,
}: ErrorStateProps) {
  const stableIdProps = errorId === undefined ? {} : { errorId };

  return (
    <div className="px-4 py-6">
      {onRetry ? (
        <ErrorSurface title={title} action="Try Again" onAction={onRetry} {...stableIdProps}>
          {message}
        </ErrorSurface>
      ) : (
        <ErrorSurface title={title} {...stableIdProps}>
          {message}
        </ErrorSurface>
      )}
    </div>
  );
}
