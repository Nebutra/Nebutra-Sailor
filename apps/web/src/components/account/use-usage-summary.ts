"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Usage summary for the subscription panel — the "quota" the panel's subtitle
 * promises. Same shape the `/usage` page renders from the gateway.
 */
export interface UsageSummary {
  period: string;
  apiCalls: { used: number; limit: number; percentUsed: number };
  aiTokens: { used: number };
}

async function fetchUsageSummary(signal: AbortSignal): Promise<UsageSummary> {
  const response = await fetch("/api/billing/usage", { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Usage request failed (${response.status})`);
  }
  return (await response.json()) as UsageSummary;
}

/**
 * Reads the same-origin usage route. Mounts with the dialog (the tab only
 * renders while open), so nothing is fetched on page loads that never open it.
 */
export function useUsageSummary() {
  return useQuery({
    queryKey: queryKeys.billingUsage.summary(),
    queryFn: ({ signal }) => fetchUsageSummary(signal),
    staleTime: 30_000,
    retry: 1,
  });
}
