import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "@nebutra/auth/react/context";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo } from "react";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { revalidateQueryCache } from "@/lib/navigation/use-revalidate";
import { queryKeys } from "@/lib/query-keys";
import { getViteAuthProvider } from "@/vite-app/app-env";

type SessionPayload = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    imageUrl?: string;
  };
  session?: {
    userId?: string;
    organizationId?: string;
    role?: string;
  };
  organization?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  membership?: {
    role?: string;
  };
};

function normalizeSession(payload: SessionPayload | null): Partial<AuthContextValue> {
  if (!payload?.user?.id && !payload?.session?.userId) return {};

  const userId = payload.user?.id ?? payload.session?.userId ?? "";

  return {
    user: {
      id: userId,
      email: payload.user?.email,
      name: payload.user?.name,
      imageUrl: payload.user?.imageUrl,
    },
    session: {
      userId,
      organizationId: payload.session?.organizationId,
      role: payload.session?.role,
    },
    organization: payload.organization?.id
      ? {
          id: payload.organization.id,
          name: payload.organization.name ?? payload.organization.slug ?? "Workspace",
          slug: payload.organization.slug ?? payload.organization.id,
        }
      : null,
    membership: payload.membership?.role ? { role: payload.membership.role } : null,
    isSignedIn: true,
  };
}

async function loadSession({ signal }: { signal?: AbortSignal }): Promise<SessionPayload | null> {
  const response = await fetch(resolveApiUrl("/api/auth/session"), {
    credentials: "include",
    signal,
    headers: { accept: "application/json" },
  });

  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load auth session (${response.status})`);

  return (await response.json().catch(() => null)) as SessionPayload | null;
}

/**
 * Re-reads the session after something changed it here — a new display name,
 * say — so the header and every other reader of the auth context catch up
 * without a page load. Resolves once the new session is in place.
 */
export function useReloadSession(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.session.all }),
    [queryClient],
  );
}

/**
 * After the server changed who is signed in: drops every cached read of the
 * previous identity and waits for the new session. The session entry is
 * refetched rather than cleared, so the shell never falls back to loading.
 */
export function useSessionScopeChanged(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(() => revalidateQueryCache(queryClient, "identity"), [queryClient]);
}

/**
 * The session is server state, so it lives in the query cache under
 * `queryKeys.session` rather than in component state: `useRevalidate()` and
 * any `invalidateQueries` refresh it in place, and concurrent readers share
 * one request.
 */
export function sessionQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.session.current(),
    queryFn: loadSession,
    // A failed first load reads as signed out; retrying only delays that.
    retry: false,
  });
}

export function BrowserAuthProvider({ children }: { children: ReactNode }) {
  const provider = getViteAuthProvider();
  const queryClient = useQueryClient();
  // A failed reload keeps the last session (TanStack Query keeps `data` on
  // error) rather than signing the user out.
  const { data: sessionPayload, isPending } = useQuery(sessionQueryOptions());

  const signOut = useCallback(async () => {
    await fetch(resolveApiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    // A different identity may sign in next on this device: drop every cached
    // read of the old one, then record the signed-out session.
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== queryKeys.session.all[0],
    });
    queryClient.setQueryData(queryKeys.session.current(), null);
  }, [queryClient]);

  const setActiveOrganization = useCallback(
    async (orgId: string) => {
      await fetch(resolveApiUrl("/api/organizations/active"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      await revalidateQueryCache(queryClient, "tenant");
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(() => {
    if (isPending) return createUnauthenticatedAuthContext(provider, false);
    return {
      ...createUnauthenticatedAuthContext(provider, true),
      ...normalizeSession(sessionPayload ?? null),
      provider,
      isLoaded: true,
      getToken: async () => null,
      signOut,
      setActiveOrganization,
    };
  }, [isPending, provider, sessionPayload, setActiveOrganization, signOut]);

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}
