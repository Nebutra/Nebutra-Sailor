/**
 * RFC 8628 device authorization (`nebutra login`) — Better Auth's built-in
 * `deviceAuthorization` plugin, mounted ONLY when the caller opts in via
 * `AuthConfig.options.deviceAuthorization`. Every app in this repo
 * (`apps/web`, `apps/forge`, `apps/kuanlan`, …) constructs its own Better
 * Auth instance from this same provider factory against the same database —
 * mounting the plugin unconditionally would expose `/api/auth/device/*` on
 * every one of them. Only `apps/auth` (the auth center) passes the flag, per
 * docs/architecture/2026-09-24-sailor-convergence.md §8. `apps/idp`'s OIDC
 * grant-type freeze is untouched — this never runs there.
 *
 * The `bearer` plugin is mounted alongside it so `nebutra whoami` (and any
 * other CLI call) can authenticate with `Authorization: Bearer <token>`
 * instead of a cookie jar; also opt-in and scoped to the same flag.
 */

import { logger } from "@nebutra/logger";
import type { BetterAuthPlugin } from "better-auth/types";

/** Public client id CLI device flow is validated against. No client secret —
 * the device-code + user-approval step is the credential, exactly as gh/az/
 * Vercel's CLIs do it. */
export const NEBUTRA_CLI_CLIENT_ID = "nebutra-cli";

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
 * here and by the CLI (packages/ops/cli/src/utils/device-auth.ts), and
 * stripped again before submission — which every endpoint above already does
 * regardless, so a user typing either `WCQM9PDH` or `WCQM-9PDH` both work.
 */
export function formatUserCodeForDisplay(rawUserCode: string): string {
  const clean = rawUserCode.replace(/-/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

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
  const allowedClientIds = new Set(
    (typeof flag === "object" ? flag.allowedClientIds : undefined) ?? [NEBUTRA_CLI_CLIENT_ID],
  );

  try {
    const { deviceAuthorization, bearer } = (await import("better-auth/plugins")) as {
      deviceAuthorization: (options: {
        expiresIn: string;
        interval: string;
        userCodeLength: number;
        validateClient: (clientId: string) => boolean;
        verificationUri: string;
      }) => BetterAuthPlugin;
      bearer: () => BetterAuthPlugin;
    };

    const device = deviceAuthorization({
      // TTL + poll interval per the design doc: short-lived code, 5s poll.
      expiresIn: "10m",
      interval: "5s",
      // 8 chars from the plugin's own default unambiguous charset
      // (ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — no 0/O/1/I/L) — displayed as
      // XXXX-XXXX by formatUserCodeForDisplay() above.
      userCodeLength: 8,
      validateClient: (clientId) => allowedClientIds.has(clientId),
      verificationUri,
    });

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
