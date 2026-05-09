"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS = 20_000;

export interface CheckoutReturnContentProps {
  organizationId?: string;
}

interface ActivePlanResponse {
  active: boolean;
  planId: string | null;
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
  const settledRef = useRef(false);

  useEffect(() => {
    settledRef.current = false;
    const url = organizationId
      ? `/api/billing/active-plan?orgId=${encodeURIComponent(organizationId)}`
      : "/api/billing/active-plan";

    const controller = new AbortController();

    const checkActive = async (): Promise<boolean> => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return false;
        const data = (await response.json()) as ActivePlanResponse;
        return Boolean(data.active);
      } catch {
        return false;
      }
    };

    const poll = async () => {
      if (settledRef.current) return;
      const active = await checkActive();
      if (settledRef.current) return;
      if (active) {
        settledRef.current = true;
        router.replace("/");
      }
    };

    // Kick off an immediate poll, then on an interval.
    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      router.replace("/choose-plan");
    }, MAX_WAIT_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [organizationId, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
      <span
        role="status"
        aria-label="Confirming your subscription"
        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--blue-9)] border-r-transparent align-[-0.125em]"
      />
      <p className="text-center text-[color:var(--neutral-11)] text-sm dark:text-white/70">
        Confirming your subscription...
      </p>
    </div>
  );
}
