"use client";

import { Spinner } from "@nebutra/ui/primitives";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { queryKeys } from "@/lib/query-keys";

const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS = 20_000;

export interface CheckoutReturnContentProps {
  organizationId?: string;
}

interface ActivePlanResponse {
  active: boolean;
  planId: string | null;
}

const INACTIVE: ActivePlanResponse = { active: false, planId: null };

/**
 * Fetch the org's active-plan status once. Network/HTTP failures are folded
 * into an inactive result so the poll keeps running (mirrors the previous
 * try/catch + `!response.ok` → false behaviour); the AbortController is replaced
 * by React Query's `signal`.
 */
async function fetchActivePlan(
  organizationId: string | undefined,
  signal: AbortSignal,
): Promise<ActivePlanResponse> {
  const url = organizationId
    ? `/api/billing/active-plan?orgId=${encodeURIComponent(organizationId)}`
    : "/api/billing/active-plan";

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return INACTIVE;
    }
    const data = (await response.json()) as ActivePlanResponse;
    return { active: Boolean(data.active), planId: data.planId ?? null };
  } catch {
    return INACTIVE;
  }
}

/**
 * Client polling shell shown after Stripe redirects the user back to the app.
 *
 * Polls `/api/billing/active-plan?orgId=...` every 2s for up to 20s. Once the
 * webhook lands and the org's plan flips to a paid tier, redirects the user
 * home. If the timeout elapses before that flip we send the user back to
 * `/choose-plan` so they can retry.
 */
export function CheckoutReturnContent({ organizationId }: CheckoutReturnContentProps) {
  const router = useRouter();
  // Keep the latest router behind a ref so `settle` (and the effects depending
  // on it) stay identity-stable even if `useRouter()` returns a fresh object
  // each render. Without this, an unstable router would re-run the reset effect
  // and silently undo a completed settle.
  const routerRef = useRef(router);
  routerRef.current = router;

  // Imperative re-entrancy guard: a single outcome wins (active vs. timeout).
  // This is pure control flow, not server cache, so it stays a ref.
  const settledRef = useRef(false);
  // Drives the poll to stop (refetchInterval → false, enabled → false).
  const [settled, setSettled] = useState(false);

  const statusQuery = useQuery({
    queryKey: queryKeys.checkoutStatus.detail(organizationId ?? "self"),
    queryFn: ({ signal }) => fetchActivePlan(organizationId, signal),
    // Immediate first poll on mount, then every 2s — stop once we've settled
    // (plan went active, or the 20s timeout fired). Gating on the reactive
    // `settled` flag clears the interval on the settling re-render; the
    // data?.active branch covers the gap before the redirect effect flips it.
    refetchInterval: (query) => (settled || query.state.data?.active ? false : POLL_INTERVAL_MS),
    // Polling is only meaningful until we settle.
    enabled: !settled,
    // Always hit the network on each poll tick.
    staleTime: 0,
    gcTime: 0,
  });

  // Settle exactly once: flip the reactive guard (disabling the poll) then
  // redirect. The settledRef guard guarantees the active path and the timeout
  // fallback can't both fire. Stable identity (empty deps) so the effects below
  // don't re-arm/reset on unrelated re-renders.
  const settle = useCallback((destination: string) => {
    if (settledRef.current) {
      return;
    }
    settledRef.current = true;
    setSettled(true);
    routerRef.current.replace(destination);
  }, []);

  const isActive = statusQuery.data?.active ?? false;

  // Redirect home as soon as the plan flips active. The settledRef guard makes
  // sure the timeout fallback can't also fire (and vice-versa).
  useEffect(() => {
    if (isActive) {
      settle("/");
    }
  }, [isActive, settle]);

  // Per-org poll session: reset the settle guard and arm a fresh 20s timeout
  // whenever the polled org changes. On timeout (still inactive) we fall back to
  // /choose-plan. `organizationId` is an intentional re-run trigger so a new org
  // gets its own settle guard + 20s window, even though the effect body only
  // writes it (never reads) — hence the suppression below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: organizationId re-runs the timer per org session, not read inside.
  useEffect(() => {
    settledRef.current = false;
    setSettled(false);

    const timeoutId = setTimeout(() => {
      settle("/choose-plan");
    }, MAX_WAIT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [organizationId, settle]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
      <Spinner aria-label="Processing payment" size={32} />
      <p className="text-center text-[color:var(--neutral-11)] text-sm">
        Confirming your subscription...
      </p>
    </div>
  );
}
