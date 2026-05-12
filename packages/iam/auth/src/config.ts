/**
 * Provider configuration helpers — single source of truth for env-driven
 * provider selection.
 *
 * The auth provider is chosen at runtime via:
 *   1. `AUTH_PROVIDER`              — server-only (Node process)
 *   2. `NEXT_PUBLIC_AUTH_PROVIDER`  — client + server (Next.js inlines at build)
 *   3. Default: `better-auth`       — Wave 2 reference implementation
 *
 * Until this helper existed, every consumer hand-rolled the precedence chain
 * (12 call sites observed pre-Phase 3). Centralizing eliminates drift: a
 * future change to the chain (e.g. additional env fallback, customer-specific
 * override) lands in one place.
 */

import type { AuthProviderId } from "./types";

const SUPPORTED: readonly AuthProviderId[] = ["clerk", "better-auth", "nextauth"];

/**
 * Read the active auth provider from environment. Falls back to `better-auth`
 * when unset or invalid. Safe to call from both server and client contexts —
 * client code only sees `NEXT_PUBLIC_AUTH_PROVIDER` (Next.js inlines it at
 * build time); the `AUTH_PROVIDER` branch is server-only and silently no-ops
 * in the browser.
 *
 * @param overrideEnv - optional env-like map for tests/SSR override
 */
export function getConfiguredAuthProvider(
  overrideEnv?: Partial<Pick<NodeJS.ProcessEnv, "AUTH_PROVIDER" | "NEXT_PUBLIC_AUTH_PROVIDER">>,
): AuthProviderId {
  const env =
    overrideEnv ??
    (typeof process !== "undefined" && process.env ? process.env : ({} as NodeJS.ProcessEnv));
  const raw = env.AUTH_PROVIDER ?? env.NEXT_PUBLIC_AUTH_PROVIDER;
  if (raw && (SUPPORTED as readonly string[]).includes(raw)) {
    return raw as AuthProviderId;
  }
  return "better-auth";
}

/**
 * Type-narrowing convenience: true when the active provider is Clerk.
 * Use to gate Clerk-native bridge code per ADR D2 (Clerk "Maintain" tier).
 */
export function isClerkProvider(provider?: AuthProviderId): boolean {
  return (provider ?? getConfiguredAuthProvider()) === "clerk";
}
