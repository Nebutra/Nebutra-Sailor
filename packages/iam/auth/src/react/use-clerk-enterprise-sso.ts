"use client";

/**
 * Clerk Enterprise SSO kickoff — package surface for product apps.
 *
 * Apps must not import `@clerk/nextjs` for SSO; they call this hook under
 * AuthProvider with `provider="clerk"`.
 *
 * Import path (dedicated subpath so the main react barrel does not statically
 * pull `@clerk/nextjs` into non-Clerk apps):
 *
 *   import { useClerkEnterpriseSso } from "@nebutra/auth/react/clerk-enterprise-sso"
 *
 * Uses Clerk v7+ `useSignIn` (SignInFuture / `signIn.sso`).
 */

import { useSignIn } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

/** Clerk strategy for domain-based Enterprise Connections. */
export const CLERK_ENTERPRISE_SSO_STRATEGY = "enterprise_sso" as const;

/** Default return path after the IdP round-trip (sign-in catch-all). */
export const DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK = "/sign-in";

export type ClerkEnterpriseSsoParams = {
  identifier: string;
  /** Post-auth destination; defaults to `/`. */
  redirectUrl?: string;
  /** Clerk callback after SSO; defaults to `/sign-in`. */
  redirectCallbackUrl?: string;
};

export type ClerkEnterpriseSsoCallParams = {
  identifier: string;
  strategy: typeof CLERK_ENTERPRISE_SSO_STRATEGY;
  redirectUrl: string;
  redirectCallbackUrl: string;
};

export type UseClerkEnterpriseSsoOptions = {
  /** Auto-start once `signIn` is ready. Default true. */
  autoStart?: boolean;
};

export type UseClerkEnterpriseSsoResult = {
  isReady: boolean;
  isStarting: boolean;
  error: unknown | null;
  start: () => void;
  retry: () => void;
};

/**
 * Normalize Clerk (and generic) error shapes for UI display.
 */
export function getClerkSsoErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("errors" in error && Array.isArray(error.errors)) {
    const first = error.errors.find(
      (entry): entry is { message: string } =>
        Boolean(entry) &&
        typeof entry === "object" &&
        "message" in entry &&
        typeof entry.message === "string",
    );
    return first?.message ?? null;
  }

  return null;
}

/**
 * Build the exact payload passed to `signIn.sso(...)` — single source of truth
 * for strategy + default callback URL (architecture / ops contracts).
 */
export function buildClerkEnterpriseSsoParams(
  options: ClerkEnterpriseSsoParams,
): ClerkEnterpriseSsoCallParams {
  return {
    identifier: options.identifier,
    strategy: CLERK_ENTERPRISE_SSO_STRATEGY,
    redirectUrl: options.redirectUrl ?? "/",
    redirectCallbackUrl: options.redirectCallbackUrl ?? DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK,
  };
}

/**
 * Starts Clerk Enterprise SSO (`strategy: "enterprise_sso"`).
 *
 * Must render under a Clerk-backed `AuthProvider` / `ClerkProvider`.
 */
export function useClerkEnterpriseSso(
  params: ClerkEnterpriseSsoParams,
  options: UseClerkEnterpriseSsoOptions = {},
): UseClerkEnterpriseSsoResult {
  const autoStart = options.autoStart ?? true;
  const { identifier } = params;
  const redirectUrl = params.redirectUrl ?? "/";
  const redirectCallbackUrl = params.redirectCallbackUrl ?? DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK;

  const { signIn } = useSignIn();
  const startedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const [error, setError] = useState<unknown | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Clerk v7 SignInFuture is present once the hook runs under ClerkProvider.
  const isReady = Boolean(signIn);

  const start = useCallback(() => {
    if (!signIn || startedRef.current) return;

    startedRef.current = true;
    setError(null);
    setIsStarting(true);

    const callParams = buildClerkEnterpriseSsoParams({
      identifier,
      redirectUrl,
      redirectCallbackUrl,
    });

    void signIn
      .sso(callParams)
      .then((result) => {
        if (result?.error) {
          setError(result.error);
          startedRef.current = false;
        }
      })
      .catch((err: unknown) => {
        setError(err);
        startedRef.current = false;
      })
      .finally(() => {
        setIsStarting(false);
      });
  }, [identifier, redirectCallbackUrl, redirectUrl, signIn]);

  const retry = useCallback(() => {
    startedRef.current = false;
    autoStartedRef.current = false;
    setError(null);
    start();
  }, [start]);

  useEffect(() => {
    if (!autoStart || !isReady || autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
  }, [autoStart, isReady, start]);

  return {
    isReady,
    isStarting,
    error,
    start,
    retry,
  };
}
