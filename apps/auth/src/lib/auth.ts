import "server-only";

import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";

let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export async function getAuth() {
  if (!authInstance) {
    const provider = getConfiguredAuthProvider();
    authInstance = await createAuth({
      provider,
      // `nebutra login` (RFC 8628 device authorization) mounts ONLY here —
      // this app IS the auth center. See
      // packages/iam/auth/src/providers/better-auth/device-authorization.ts
      // and docs/architecture/2026-09-24-sailor-convergence.md §8.
      options: { deviceAuthorization: true },
    });
  }
  return authInstance;
}

/**
 * The incoming request, reconstructed from the Server Component header
 * store — same shape as apps/web's `buildServerRequest()`. The auth
 * provider's `getSession()` takes a `Request`; Server Components don't have
 * one, and `AuthProvider.getSession` also uses `request.url`'s host to
 * decide whether to resolve the session locally vs. proxy to the auth
 * center (see `shouldResolveSessionAtAuthCenter`) — since this app IS the
 * auth center, BETTER_AUTH_URL is always this same host, so that check is a
 * same-host no-op here and the session resolves from the local Prisma
 * adapter directly.
 */
export async function buildServerRequest(): Promise<Request> {
  const requestHeaders = new Headers(await headers());
  const origin = (process.env.BETTER_AUTH_URL || "http://localhost:3101").replace(/\/$/, "");
  return new Request(origin, { headers: requestHeaders });
}
