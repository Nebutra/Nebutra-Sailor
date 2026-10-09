"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { queryKeys } from "@/lib/query-keys";

/**
 * What a mutation changed on the server, and so how much cached data is stale.
 *
 * - `data`: rows changed inside the current tenant. Cached data stays on
 *   screen while it refetches (stale-while-revalidate).
 * - `tenant`: the active organization changed. Tenant-scoped reads belonged
 *   to the previous workspace, so they are dropped before refetching: showing
 *   the old workspace's rows under the new workspace's name, even for a frame,
 *   is a data leak. Reads scoped to the user (the session, the list of their
 *   organizations) are only invalidated, so the shell keeps rendering.
 * - `identity`: the signed-in user changed (impersonation, accepting an
 *   invitation into a new tenant). Everything but the session entry is dropped.
 */
export type RevalidateScope = "data" | "tenant" | "identity";

const SESSION_ROOT = queryKeys.session.all[0];
const ORGANIZATIONS_LIST = queryKeys.organizations.list();

function isUserScoped(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === SESSION_ROOT ||
    (queryKey[0] === ORGANIZATIONS_LIST[0] && queryKey[1] === ORGANIZATIONS_LIST[1])
  );
}

/**
 * Brings the TanStack Query cache up to date with a server change of the
 * given scope. Resolves once the active queries have refetched.
 */
export async function revalidateQueryCache(
  queryClient: QueryClient,
  scope: RevalidateScope = "data",
): Promise<void> {
  if (scope === "data") {
    await queryClient.invalidateQueries();
    return;
  }
  const keep =
    scope === "tenant"
      ? isUserScoped
      : (queryKey: readonly unknown[]) => queryKey[0] === SESSION_ROOT;
  await Promise.all([
    queryClient.resetQueries({ predicate: (query) => !keep(query.queryKey) }),
    queryClient.invalidateQueries({ predicate: (query) => keep(query.queryKey) }),
  ]);
}

/**
 * Re-reads server state in place after a mutation, with no page load.
 *
 * Replaces `router.refresh()` as the "something changed on the server" call:
 * it refreshes the router's own data (Next: the RSC payload; Vite: the
 * TanStack Router loaders, via the next-compat shim) and the TanStack Query
 * cache, which `router.refresh()` alone never touches. Scroll position, focus
 * and client state survive, unlike `location.reload()`.
 */
export function useRevalidate(): (scope?: RevalidateScope) => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(
    async (scope: RevalidateScope = "data") => {
      router.refresh();
      await revalidateQueryCache(queryClient, scope);
    },
    [queryClient, router],
  );
}
