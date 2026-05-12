/**
 * Auth feature flags — dual-source resolution.
 *
 * Gates optional auth UI surfaces (passkey enroll, org switcher, 2FA enroll,
 * magic-link form) behind a single async check so consumers don't have to
 * know whether the answer came from an env var or the central feature-flags
 * service.
 *
 * Names mirror `AuthCapabilities` from `./types` so the flag layer and the
 * runtime capability probe stay aligned: a feature is shown only when both
 * the **flag** says "yes" (operator/customer wants it) AND the **capability**
 * says "yes" (the provider can actually serve it).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_AUTH_<NAME> env var       — dev/preview, fast, no async
 *   2. @nebutra/feature-flags isFeatureEnabled — prod gradual rollout
 *   3. safe default `false`                  — on any error / missing pkg
 *
 * @nebutra/feature-flags is loaded via dynamic import so it remains an
 * optional peer — `@nebutra/auth` does not declare it as a hard dependency.
 */

/** Auth-related feature names. One-to-one with {@link AuthCapabilities}. */
export type AuthFeature =
  | "passkeys"
  | "organizations"
  | "twoFactor"
  | "magicLink"
  | "impersonation";

const ENV_KEY: Record<AuthFeature, string> = {
  passkeys: "NEXT_PUBLIC_AUTH_PASSKEYS",
  organizations: "NEXT_PUBLIC_AUTH_ORGANIZATIONS",
  twoFactor: "NEXT_PUBLIC_AUTH_TWO_FACTOR",
  magicLink: "NEXT_PUBLIC_AUTH_MAGIC_LINK",
  impersonation: "NEXT_PUBLIC_AUTH_IMPERSONATION",
} as const;

/** Tri-state read of a boolean env var: "1"/"true" → on, "0"/"false" → off, else → unset. */
function readEnv(name: AuthFeature): boolean | undefined {
  const key = ENV_KEY[name];
  const raw = typeof process !== "undefined" ? process.env[key] : undefined;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

/**
 * Evaluation context forwarded to `@nebutra/feature-flags`. Mirrors the
 * fields that `FeatureFlagContext` accepts. Callers pass `organizationId`
 * (canonical auth term); we translate it to `tenantId` for the flag system.
 */
export interface AuthFeatureContext {
  userId?: string;
  organizationId?: string;
  environment?: string;
}

/**
 * Synchronous feature-flag check. Reads `process.env` only — never touches
 * the feature-flags service. Use at SSR / middleware / RSC boundaries where
 * awaiting is impossible. Returns `false` for any unset env var (safe default).
 */
export function isAuthFeatureEnabledSync(name: AuthFeature): boolean {
  return readEnv(name) === true;
}

/**
 * Async feature-flag check. Env wins when set; otherwise defers to
 * `@nebutra/feature-flags`. Never throws — returns `false` on any failure.
 *
 * @param name - one of the {@link AuthFeature} values
 * @param ctx  - optional evaluation context (userId, organizationId, environment)
 */
export async function isAuthFeatureEnabled(
  name: AuthFeature,
  ctx?: AuthFeatureContext,
): Promise<boolean> {
  // 1. env shortcut — authoritative when set
  const envValue = readEnv(name);
  if (envValue !== undefined) return envValue;

  // 2. defer to @nebutra/feature-flags (optional peer — dynamic import).
  // Declared as an optional peerDependency in package.json so TypeScript can
  // resolve the module name without making it a hard build-time requirement.
  // The runtime try/catch handles the missing-installation case.
  try {
    // `webpackIgnore: true` — keep the import opaque to webpack so it never
    // bundles `@nebutra/feature-flags` (which transitively imports
    // `@nebutra/cache` with its Node-only ioredis backend) into client
    // chunks. This file is re-exported from `@nebutra/auth/client`, so any
    // `"use client"` component touching `isAuthFeatureEnabled` would
    // otherwise drag the entire cache stack into the browser bundle.
    const ff: unknown = await import(/* webpackIgnore: true */ "@nebutra/feature-flags");
    const flagName = `auth.${name}`;
    const context = {
      ...(ctx?.userId !== undefined ? { userId: ctx.userId } : {}),
      ...(ctx?.organizationId !== undefined ? { tenantId: ctx.organizationId } : {}),
      ...(ctx?.environment !== undefined ? { environment: ctx.environment } : {}),
    };

    const mod = ff as {
      isFeatureEnabled?: (flag: string, c?: unknown) => Promise<boolean> | boolean;
      evaluate?: (flag: string, c?: unknown) => Promise<boolean> | boolean;
    };

    if (typeof mod.isFeatureEnabled === "function") {
      return Boolean(await mod.isFeatureEnabled(flagName, context));
    }
    if (typeof mod.evaluate === "function") {
      return Boolean(await mod.evaluate(flagName, context));
    }
    return false;
  } catch {
    // Package missing, throws during evaluation, etc. — safe default.
    return false;
  }
}
