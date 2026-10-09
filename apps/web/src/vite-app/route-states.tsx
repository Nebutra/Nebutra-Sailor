import { ErrorState, FullPageStatus } from "@nebutra/ui/layout";
import { Skeleton } from "@nebutra/ui/primitives";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * The router's default async states, so every route has more than a success
 * state (Frontend Constitution §5) without each one re-implementing them.
 *
 * Timing matches the interaction contract's pending rule
 * (`interaction.pending` in @nebutra/ui: show after 200ms, then stay 400ms):
 * a fast navigation never flashes the skeleton, and a slow one never blinks it.
 */
export const ROUTE_PENDING_MS = 200;
export const ROUTE_PENDING_MIN_MS = 400;

/** A page-shaped skeleton: heading, lede and a content block. */
export function RoutePending() {
  return (
    <section aria-busy="true" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <Skeleton width={240} height={28} />
        <Skeleton width={360} height={16} />
      </div>
      <Skeleton width="100%" height={192} />
      <span role="status" className="sr-only">
        Loading…
      </span>
    </section>
  );
}

/**
 * A route's loader or component threw. Retry clears any failed queries the
 * route reads and re-runs its loaders in place — no page load.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  useEffect(() => {
    // Lets queries that threw into this boundary fetch again on retry.
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  return (
    <ErrorState
      title="This page didn't load"
      message={
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong on our side. Try again in a moment."
      }
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
}

/** No route matched the address. */
export function RouteNotFound() {
  return (
    <FullPageStatus
      variant="section"
      code="Error 404"
      title="We couldn't find that page."
      description="The address may be mistyped, or the page has moved."
      primaryAction={{ label: "Go home", href: "/" }}
    />
  );
}
