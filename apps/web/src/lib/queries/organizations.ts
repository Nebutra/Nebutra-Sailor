import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Client reads of the caller's organizations, shared by every surface that
 * lists them (the shell's Projects section, the top-nav switcher) so they
 * dedupe onto one request and one cache entry.
 */

export interface OrganizationListItem {
  id: string;
  name: string;
  slug?: string | null;
}

export async function fetchOrganizationList(signal?: AbortSignal): Promise<OrganizationListItem[]> {
  const response = await fetch("/api/organizations", { credentials: "include", signal });
  if (!response.ok) {
    throw new Error(`Failed to load organizations (${response.status})`);
  }
  const payload = (await response.json().catch(() => null)) as {
    organizations?: OrganizationListItem[];
  } | null;
  return Array.isArray(payload?.organizations) ? payload.organizations : [];
}

export function organizationListQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => fetchOrganizationList(signal),
  });
}
