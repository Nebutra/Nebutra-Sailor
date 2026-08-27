"use client";

import { useAuth } from "@nebutra/auth/client";
import { useCallback, useMemo } from "react";
import { api } from "@/lib/api";

/**
 * Client-side hook: returns an API client with provider-agnostic JWT auto-injected.
 * Use in Client Components.
 */
export function useApi() {
  const { getToken } = useAuth();

  const authedGet = useCallback(
    async <T>(endpoint: string) => {
      const token = (await getToken()) ?? undefined;
      return api.get<T>(endpoint, { token });
    },
    [getToken],
  );

  const authedPost = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.post<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedPut = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.put<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedPatch = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.patch<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedDelete = useCallback(
    async <T>(endpoint: string) => {
      const token = (await getToken()) ?? undefined;
      return api.delete<T>(endpoint, { token });
    },
    [getToken],
  );

  return useMemo(
    () => ({
      get: authedGet,
      post: authedPost,
      put: authedPut,
      patch: authedPatch,
      delete: authedDelete,
    }),
    [authedGet, authedPost, authedPut, authedPatch, authedDelete],
  );
}
