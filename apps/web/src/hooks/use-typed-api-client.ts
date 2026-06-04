"use client";

import { useAuth } from "@nebutra/auth/client";
import { useCallback } from "react";

import { createBrowserApiClient } from "@/lib/api/browser-client";

export function useTypedApiClient() {
  const { getToken } = useAuth();

  return useCallback(async () => {
    const token = (await getToken()) ?? null;
    return createBrowserApiClient(token);
  }, [getToken]);
}
