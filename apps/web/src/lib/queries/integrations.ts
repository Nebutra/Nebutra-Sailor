import { queryOptions } from "@tanstack/react-query";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * The tenant's connected integrations (`GET /api/v1/integrations`), shared by
 * the Integrations page and the Startup OS connectors menu so both read one
 * cache entry and a connect/disconnect on one updates the other.
 */

export interface IntegrationRecord {
  id: string;
  type: "SHOPIFY" | "SHOPLINE" | "STRIPE" | "CUSTOM";
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export const INTEGRATIONS_ENDPOINT = "/api/v1/integrations";

export async function fetchIntegrations(signal?: AbortSignal): Promise<IntegrationRecord[]> {
  const response = await fetch(resolveApiUrl(INTEGRATIONS_ENDPOINT), {
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load integrations (${response.status})`);
  const payload = (await response.json().catch(() => null)) as {
    integrations?: IntegrationRecord[];
  } | null;
  return payload?.integrations ?? [];
}

export function integrationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.integrations.list(),
    queryFn: ({ signal }) => fetchIntegrations(signal),
  });
}
