/**
 * RFC 8628 device-authorization client for `nebutra login` / `nebutra
 * whoami`. Talks to the auth center's Better Auth `deviceAuthorization` +
 * `bearer` plugins — see
 * packages/iam/auth/src/providers/better-auth/device-authorization.ts.
 */
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

/** Fixed public client id — validated server-side, no client secret. */
export const NEBUTRA_CLI_CLIENT_ID = "nebutra-cli";

/**
 * Base URL of the auth center. `NEBUTRA_AUTH_URL` overrides for self-hosted
 * / local dev, same convention as `NEBUTRA_LICENSE_API_URL` in
 * commands/license.ts. Falls back to `@nebutra/brand`'s `auth` domain
 * (`auth.<brand apex>`) — never a hardcoded brand literal, so a `pnpm
 * brand:apply` rebrand propagates here too.
 */
export function resolveAuthBaseUrl(): string {
  const override = process.env.NEBUTRA_AUTH_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return getBrandOrigin("auth");
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export class DeviceAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DeviceAuthError";
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function requestDeviceCode(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeviceCodeResponse> {
  const res = await fetchImpl(`${baseUrl}/api/auth/device/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: NEBUTRA_CLI_CLIENT_ID }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new DeviceAuthError(
      typeof body.error === "string" ? body.error : "request_failed",
      typeof body.error_description === "string"
        ? body.error_description
        : `Could not reach ${brand.name}'s auth center (${res.status}).`,
    );
  }
  return body as unknown as DeviceCodeResponse;
}

export interface DeviceTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** One `/device/token` poll. Throws `DeviceAuthError` with the RFC 8628 error
 * code (`authorization_pending`, `slow_down`, `expired_token`,
 * `access_denied`, `invalid_grant`) — callers drive the poll loop. */
export async function pollDeviceToken(
  baseUrl: string,
  deviceCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeviceTokenResponse> {
  const res = await fetchImpl(`${baseUrl}/api/auth/device/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: NEBUTRA_CLI_CLIENT_ID,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new DeviceAuthError(
      typeof body.error === "string" ? body.error : "request_failed",
      typeof body.error_description === "string" ? body.error_description : `HTTP ${res.status}`,
    );
  }
  return body as unknown as DeviceTokenResponse;
}

export interface PollOptions {
  intervalSeconds: number;
  /** Unix ms deadline — from device_code expires_in. */
  deadline: number;
  fetchImpl?: typeof fetch;
  /** Called before each wait, e.g. to print a spinner tick. Not called
   * before the very first attempt. */
  onWaiting?: (intervalSeconds: number) => void;
  /** A poll got no answer and will be retried after backing off. */
  onTransientFailure?: (error: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MAX_BACKOFF_SECONDS = 30;

/**
 * A poll that never got an answer: the request timed out, the connection
 * dropped, or the server failed (5xx, surfaced as `request_failed`). Distinct
 * from the RFC 8628 errors, which are answers and end the loop.
 */
export function isTransientPollFailure(error: unknown): boolean {
  if (error instanceof DeviceAuthError) return error.code === "request_failed";
  if (error instanceof TypeError) return true; // fetch: network failure
  const name = (error as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

/**
 * Polls `/device/token` until approved, denied, or expired — honouring
 * `slow_down` by adding 5s to the interval, per RFC 8628 §3.5.
 */
export async function pollUntilComplete(
  baseUrl: string,
  deviceCode: string,
  options: PollOptions,
): Promise<DeviceTokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  let interval = options.intervalSeconds;

  for (;;) {
    if (Date.now() >= options.deadline) {
      throw new DeviceAuthError("expired_token", "The device code expired before it was approved.");
    }

    options.onWaiting?.(interval);
    await sleep(interval * 1000);

    try {
      return await pollDeviceToken(baseUrl, deviceCode, fetchImpl);
    } catch (error) {
      if (isTransientPollFailure(error)) {
        // RFC 8628 §3.5: on a connection timeout the client backs off and
        // keeps polling. One slow or dropped request is not a verdict on the
        // device code — only the server's answer, or the deadline, is.
        interval = Math.min(interval + 5, MAX_BACKOFF_SECONDS);
        options.onTransientFailure?.(error);
        continue;
      }
      if (!(error instanceof DeviceAuthError)) throw error;
      if (error.code === "authorization_pending") continue;
      if (error.code === "slow_down") {
        interval += 5;
        continue;
      }
      // expired_token, access_denied, invalid_grant — the server's answer.
      throw error;
    }
  }
}

export interface WhoamiResult {
  userId: string;
  email: string | null;
  name: string | null;
}

/** GET /api/auth/get-session with `Authorization: Bearer <token>` — the
 * `bearer` plugin converts it into a session read, same endpoint the auth
 * center's own cross-app session bridge uses (fetchAuthCenterSession). */
export async function fetchWhoami(
  baseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WhoamiResult | null> {
  const res = await fetchImpl(`${baseUrl}/api/auth/get-session`, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const body = await readJson(res);
  const user = body.user as Record<string, unknown> | undefined;
  if (!user || typeof user.id !== "string") return null;
  return {
    userId: user.id,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
  };
}
