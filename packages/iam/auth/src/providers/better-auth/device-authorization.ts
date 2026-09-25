/**
 * RFC 8628 device authorization (`nebutra login`) — Better Auth's built-in
 * `deviceAuthorization` plugin, mounted ONLY when the caller opts in via
 * `AuthConfig.options.deviceAuthorization`. Every app in this repo
 * (`apps/web`, `apps/forge`, `apps/kuanlan`, …) constructs its own Better
 * Auth instance from this same provider factory against the same database —
 * mounting the plugin unconditionally would expose `/api/auth/device/*` on
 * every one of them. Only `apps/auth`'s Next route passes the flag, per
 * docs/architecture/2026-09-24-sailor-convergence.md §8. `apps/idp`'s OIDC
 * grant-type freeze is untouched — this never runs there.
 *
 * Production auth-center traffic does NOT run this file — it runs
 * the Cloudflare Workers edge (apps/auth/src/worker-edge.ts, Kysely on a
 * raw `pg.Pool`, not Prisma), which mounts the identical plugin pair from
 * the SAME options builder in ./device-authorization-config.ts. This file
 * (the Prisma/Next path) still matters for local dev and any deployment
 * where DEPLOY_TARGET_AUTH isn't `cloudflare-workers`. Both paths must
 * resolve to the one physical table — see that file's header.
 *
 * The `bearer` plugin is mounted alongside it so `nebutra whoami` (and any
 * other CLI call) can authenticate with `Authorization: Bearer <token>`
 * instead of a cookie jar; also opt-in and scoped to the same flag.
 */

import { logger } from "@nebutra/logger";
import type { BetterAuthPlugin } from "better-auth/types";
import {
  buildDeviceAuthorizationOptions,
  type DeviceAuthorizationPluginOptions,
} from "./device-authorization-config";

export {
  DEVICE_AUTH_MODEL_NAME,
  DEVICE_AUTH_RATE_LIMIT_RULES,
  DEVICE_AUTH_SCHEMA_FIELDS,
  formatUserCodeForDisplay,
  NEBUTRA_CLI_CLIENT_ID,
} from "./device-authorization-config";

export interface DeviceAuthorizationFlagOptions {
  /** Public client ids allowed to start a device flow. Defaults to just the
   * CLI's fixed id — this is deliberately narrow; there is no dynamic client
   * registration (mirrors the IdP's own frozen grant-type posture). */
  allowedClientIds?: readonly string[];
}

export async function loadBetterAuthDeviceAuthorizationPlugins(
  flag: boolean | DeviceAuthorizationFlagOptions | undefined,
  verificationUri: string,
): Promise<BetterAuthPlugin[]> {
  if (!flag) return [];
  const allowedClientIds = typeof flag === "object" ? flag.allowedClientIds : undefined;

  try {
    const { deviceAuthorization, bearer } = (await import("better-auth/plugins")) as {
      deviceAuthorization: (options: DeviceAuthorizationPluginOptions) => BetterAuthPlugin;
      bearer: () => BetterAuthPlugin;
    };

    const device = deviceAuthorization(
      buildDeviceAuthorizationOptions({
        verificationUri,
        ...(allowedClientIds ? { allowedClientIds } : {}),
      }),
    );

    // Bearer must come before other plugins that read session cookies so a
    // `Authorization: Bearer <token>` header is converted early. Order here
    // only matters relative to itself — betterAuth() flattens the array.
    return [bearer(), device];
  } catch (error) {
    logger.warn(
      "Better Auth: device-authorization plugin not available — `nebutra login` device endpoints will not mount.",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return [];
  }
}
