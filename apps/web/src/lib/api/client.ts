/**
 * Typed API client for the product API gateway.
 *
 * Types are auto-generated from the OpenAPI spec via:
 *   pnpm --filter @nebutra/gateway generate:spec
 *   pnpm --filter @nebutra/web generate:api-types
 *
 * The generated file `types.generated.ts` is committed as a stub and overwritten in CI.
 *
 * Usage in Server Components:
 *   import { getTypedApi } from "@/lib/api/client";
 *   const api = await getTypedApi();
 *   const { data } = await api.GET("/api/v1/ai/models");
 *
 * Usage in Client Components:
 *   import { browserApiClient } from "@/lib/api/browser-client";
 *   const { data } = await browserApiClient.GET("/api/v1/ai/models");
 */

import { getConfiguredAuthProvider } from "@nebutra/auth";
import createClient from "openapi-fetch";

// `types.generated.ts` is produced by `pnpm generate:api-types`.
// A stub is committed so the project typechecks before generation.
import { API_BASE_URL } from "./browser-client";
import type { paths } from "./types.generated";

export { API_BASE_URL } from "./browser-client";

// ── Server-side factory — auto-injects provider-agnostic session ─────────────

/**
 * Returns a typed API client with the session warmed up via cookies.
 * Call this in Server Components, Route Handlers, and Server Actions.
 * Uses provider-agnostic auth from @nebutra/auth.
 *
 * @example
 * const api = await getTypedApi();
 * const { data, error } = await api.GET("/api/v1/ai/models");
 */
export async function getTypedApi() {
  const provider = getConfiguredAuthProvider();

  const client = createClient<paths>({ baseUrl: API_BASE_URL });

  // Sessions generally rely on cookies which Next.js `fetch` passes natively.
  // Ensure the auth layer has been initialized if needed.
  const { createAuth } = await import("@nebutra/auth/server");
  const auth = await createAuth({ provider });
  await auth.getSession(); // Warm up or validate the session

  return client;
}
