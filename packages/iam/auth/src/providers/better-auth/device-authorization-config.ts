/**
 * Shared, ZERO-IMPORT config for Better Auth's `deviceAuthorization` (+
 * `bearer`) plugins — the `nebutra login` device flow.
 *
 * This file is imported from two places that must stay behaviourally
 * identical but run on two different database adapters:
 *
 *   - packages/iam/auth/src/providers/better-auth/device-authorization.ts
 *     (Node auth-center, `apps/auth`'s Next route — Prisma adapter, resolves
 *     `modelName` against a model's `@@map` dbName via Better Auth's Prisma
 *     adapter, same as `user: { modelName: "AuthUser" }` etc. in
 *     ../better-auth.ts resolves against `AuthUser`'s `@@map("auth_users")`.)
 *
 *   - apps/auth/src/worker-edge.ts (the production auth center —
 *     Cloudflare Workers, Kysely on a raw `pg.Pool`, default search_path.
 *     `modelName` there is the LITERAL public-schema table name, same as
 *     its own `user: { modelName: "auth_users", fields: {...} } }`.)
 *
 * `DEVICE_AUTH_MODEL_NAME`/`DEVICE_AUTH_SCHEMA_FIELDS` therefore have to be
 * one value both adapters agree resolves to the same physical table
 * (`public.auth_device_codes`, snake_case columns) — hence a single source
 * instead of two configs that could silently drift.
 *
 * MUST stay free of VALUE imports (a `import type` is fine — it is erased
 * at compile time and costs the bundle nothing): apps/auth/src/worker-edge.ts
 * is a Cloudflare Workers Free-plan bundle (see its own file header and
 * tests/architecture/auth-provider-boundary.test.ts) that deliberately does
 * not depend on the rest of `@nebutra/auth` (no Prisma, no capability
 * builders, no React). Importing this one file costs it nothing only as
 * long as it never pulls in runtime code — do not add a non-type import
 * here without moving this file (or splitting it) first.
 */

import type { TimeString } from "better-auth/plugins";

/** Public client id the CLI's device flow is validated against. No client
 * secret — the device-code + user-approval step is the credential, exactly
 * as gh/az/Vercel's CLIs do it. */
export const NEBUTRA_CLI_CLIENT_ID = "nebutra-cli";

/** Physical table: `public.auth_device_codes` (see the Prisma model
 * `AuthDeviceCode` `@@map`, and the migration that creates it). */
export const DEVICE_AUTH_MODEL_NAME = "auth_device_codes";

/** Better Auth's plugin-internal field keys (camelCase, fixed by the
 * plugin) mapped to this table's snake_case columns — mirrors how
 * `user`/`session`/`account`/`verification` are mapped in both call sites. */
export const DEVICE_AUTH_SCHEMA_FIELDS = {
  deviceCode: "device_code",
  userCode: "user_code",
  userId: "user_id",
  expiresAt: "expires_at",
  status: "status",
  lastPolledAt: "last_polled_at",
  pollingInterval: "polling_interval",
  clientId: "client_id",
  scope: "scope",
} as const;

/** Tighter-than-default limits on the unauthenticated-by-design device
 * endpoints — a device polls before anyone has signed in, so these can't
 * rely on session-based throttling. Better Auth's own global default is
 * 100 req / 60s per IP+path. */
export const DEVICE_AUTH_RATE_LIMIT_RULES = {
  "/device/code": { window: 60, max: 10 },
  "/device/token": { window: 60, max: 30 },
  "/device/approve": { window: 60, max: 10 },
  "/device/deny": { window: 60, max: 10 },
} as const;

export interface BuildDeviceAuthorizationOptionsInput {
  /** e.g. `https://auth.<brand-apex>/device` — where a human confirms the
   * code shown by the CLI. */
  verificationUri: string;
  /** Defaults to just the CLI's fixed id — deliberately narrow, no dynamic
   * client registration (mirrors the IdP's own frozen grant-type posture). */
  allowedClientIds?: readonly string[];
}

export interface DeviceAuthorizationPluginOptions {
  expiresIn: TimeString;
  interval: TimeString;
  userCodeLength: number;
  validateClient: (clientId: string) => boolean;
  verificationUri: string;
  schema: {
    deviceCode: {
      modelName: string;
      fields: typeof DEVICE_AUTH_SCHEMA_FIELDS;
    };
  };
}

/**
 * The one options object passed to `deviceAuthorization(...)` on both the
 * Node auth-center and the Cloudflare Workers edge. TTL 10 minutes, poll
 * interval 5 seconds — the design's stated values. User code format is the
 * plugin's own default 8-char unambiguous charset (no 0/O/1/I/L); hyphenated
 * `XXXX-XXXX` display formatting is `formatUserCodeForDisplay()` below, a
 * presentation-only concern applied by the CLI and the `/device` page, never
 * stored — see that function's docstring for why.
 */
export function buildDeviceAuthorizationOptions(
  input: BuildDeviceAuthorizationOptionsInput,
): DeviceAuthorizationPluginOptions {
  const allowedClientIds = new Set(input.allowedClientIds ?? [NEBUTRA_CLI_CLIENT_ID]);
  return {
    expiresIn: "10m",
    interval: "5s",
    userCodeLength: 8,
    validateClient: (clientId: string) => allowedClientIds.has(clientId),
    verificationUri: input.verificationUri,
    schema: {
      deviceCode: {
        modelName: DEVICE_AUTH_MODEL_NAME,
        fields: DEVICE_AUTH_SCHEMA_FIELDS,
      },
    },
  };
}

/**
 * Human-friendly display of a device user code: `WCQM9PDH` → `WCQM-9PDH`.
 *
 * The plugin's `/device`, `/device/approve` and `/device/deny` endpoints all
 * strip hyphens from whatever the caller submits before comparing it against
 * the STORED code (`userCode.replace(/-/g, "")`), but do NOT strip hyphens
 * from the value `/device/code` stores in the first place. So the code must
 * be GENERATED flat (no hyphen) — this repo intentionally does not override
 * `generateUserCode`, leaving the plugin's own default generator in place,
 * which already draws from the same unambiguous charset (no 0/O/1/I/L) this
 * design calls for. The hyphen is purely a display-layer insertion, applied
 * here, by the CLI (packages/ops/cli/src/utils/device-auth.ts) and by
 * apps/auth's device-approval-form.tsx (duplicated there, not imported —
 * that file is a client bundle and should not pull in a server package) —
 * and stripped again before submission, which every endpoint above already
 * does regardless, so a user typing either `WCQM9PDH` or `WCQM-9PDH` works.
 */
export function formatUserCodeForDisplay(rawUserCode: string): string {
  const clean = rawUserCode.replace(/-/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}
