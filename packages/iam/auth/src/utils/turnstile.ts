/**
 * Cloudflare Turnstile server-side verification.
 *
 * Verifies a Turnstile widget token against Cloudflare's `siteverify` endpoint
 * before allowing privileged actions (sign-in, sign-up, password reset). When
 * `TURNSTILE_SECRET_KEY` is not set, verification is **skipped** (returns
 * `{ ok: true, skipped: true }`) so that local dev and customers who have not
 * yet onboarded Turnstile are not blocked.
 *
 * Env:
 *  - TURNSTILE_SECRET_KEY (server) — when present, verification is enforced.
 *  - NEXT_PUBLIC_TURNSTILE_SITE_KEY (client, not used here) — surfaced to the
 *    widget on the browser; the form must include it to mint a token.
 */

import { logger } from "@nebutra/logger";

const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const DEFAULT_TIMEOUT_MS = 4000;

export interface VerifyTurnstileOptions {
  /** Visitor IP from `x-forwarded-for` / `cf-connecting-ip` (recommended). */
  remoteIp?: string;
  /** Override the global secret (useful for tests). */
  secret?: string;
  /** Network timeout in milliseconds. Defaults to 4000ms. */
  timeoutMs?: number;
  /**
   * When true, throw on missing/invalid token instead of returning `ok: false`.
   * Useful for terse `await verifyTurnstileOrThrow(token)` call-sites.
   */
  throwOnFailure?: boolean;
}

export interface VerifyTurnstileResult {
  /** Whether the request should be allowed to proceed. */
  ok: boolean;
  /**
   * True when no `TURNSTILE_SECRET_KEY` is configured. The caller may decide
   * to log a warning in production but should NOT reject the request — the
   * deployment has opted out of Turnstile.
   */
  skipped: boolean;
  /** Cloudflare error codes when `ok === false`. */
  errorCodes?: string[];
  /** Diagnostic / debug payload. */
  hostname?: string;
  challengeTs?: string;
  action?: string;
}

interface SiteVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

/**
 * Verify a Turnstile token. See module-level docs for the skip-on-no-secret
 * semantics. Network errors return `{ ok: false }` (fail-closed) so a flaky
 * Cloudflare can't be silently bypassed.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  options: VerifyTurnstileOptions = {},
): Promise<VerifyTurnstileResult> {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (typeof token !== "string" || token.trim() === "") {
    if (options.throwOnFailure) {
      throw new Error("Turnstile token missing");
    }
    return { ok: false, skipped: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (options.remoteIp) body.set("remoteip", options.remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn("Turnstile siteverify returned non-2xx — failing closed", {
        status: response.status,
      });
      if (options.throwOnFailure) {
        throw new Error(`Turnstile siteverify status ${response.status}`);
      }
      return { ok: false, skipped: false, errorCodes: ["internal-error"] };
    }

    const data = (await response.json()) as SiteVerifyResponse;
    const ok = data.success === true;

    if (!ok && options.throwOnFailure) {
      throw new Error(
        `Turnstile verification failed: ${(data["error-codes"] ?? []).join(", ") || "unknown"}`,
      );
    }

    const result: VerifyTurnstileResult = { ok, skipped: false };
    if (data["error-codes"]) result.errorCodes = data["error-codes"];
    if (data.hostname) result.hostname = data.hostname;
    if (data.challenge_ts) result.challengeTs = data.challenge_ts;
    if (data.action) result.action = data.action;
    return result;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      logger.warn("Turnstile siteverify timed out — failing closed");
    } else {
      logger.error("Turnstile siteverify threw", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (options.throwOnFailure) throw error;
    return { ok: false, skipped: false, errorCodes: ["network-error"] };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convenience wrapper that throws when Turnstile rejects the token. Use this
 * at the entry of API route handlers where the failure path is "respond 403".
 */
export async function verifyTurnstileOrThrow(
  token: string | null | undefined,
  options: Omit<VerifyTurnstileOptions, "throwOnFailure"> = {},
): Promise<VerifyTurnstileResult> {
  return verifyTurnstileToken(token, { ...options, throwOnFailure: true });
}

/**
 * Whether Turnstile is configured server-side. Useful for conditionally
 * rendering the widget on the client (mirror this through a server component
 * or a public boolean prop).
 */
export function isTurnstileConfigured(): boolean {
  return (
    typeof process.env.TURNSTILE_SECRET_KEY === "string" && process.env.TURNSTILE_SECRET_KEY !== ""
  );
}
