/**
 * Typed API client for the Nebutra API gateway.
 *
 * Types are auto-generated from the OpenAPI spec via:
 *   pnpm --filter @nebutra/api-gateway generate:spec
 *   pnpm --filter @nebutra/web generate:api-types
 *
 * The generated file `types.generated.ts` is committed as a stub and overwritten in CI.
 *
 * Usage in Server Components (with Clerk JWT):
 *   import { getTypedApi } from "@/lib/api/client";
 *   const api = await getTypedApi();
 *   const { data } = await api.GET("/api/v1/ai/models");
 *
 * Usage in Client Components:
 *   import { browserApiClient } from "@/lib/api/client";
 *   const { data } = await browserApiClient.GET("/api/v1/ai/models");
 */

import createClient, { type Middleware } from "openapi-fetch";

// `types.generated.ts` is produced by `pnpm generate:api-types`.
// A stub is committed so the project typechecks before generation.
import type { paths } from "./types.generated";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3002";

// ── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Creates an openapi-fetch Middleware that injects a Bearer token.
 * Pass the Clerk JWT obtained from `auth().getToken()`.
 */
function createAuthMiddleware(token: string): Middleware {
  return {
    async onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  };
}

// ── Browser (client-side) client — no auth token ─────────────────────────────
// For authenticated browser requests, use the React Query hooks which inject
// the Clerk session token via SWR/TanStack Query auth adapters.

export const browserApiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// ── Server-side factory — auto-injects provider-agnostic JWT ─────────────────────────────

/**
 * Returns a typed API client with the current user's JWT pre-injected.
 * Call this in Server Components, Route Handlers, and Server Actions.
 * Uses provider-agnostic auth from @nebutra/auth.
 *
 * @example
 * const api = await getTypedApi();
 * const { data, error } = await api.GET("/api/v1/ai/models");
 */
export async function getTypedApi() {
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth") as
    | "clerk"
    | "better-auth";

  const client = createClient<paths>({ baseUrl: API_BASE_URL });
  let token: string | null = null;

  if (provider === "clerk") {
    // Dynamically import clerk so we don't break strict environments
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    if (session?.userId) {
      token = await session.getToken();
    }
  } else {
    // For better-auth, sessions generally rely on cookies which Next.js `fetch` passes natively.
    // Ensure the auth layer has been initialized if needed.
    const { createAuth } = await import("@nebutra/auth/server");
    const auth = await createAuth({ provider });
    await auth.getSession(); // Warm up or validate the session
  }

  if (token) {
    client.use(createAuthMiddleware(token));
  }

  return client;
}
