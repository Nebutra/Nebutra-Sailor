/**
 * CAPTCHA Middleware for Hono
 * Use on routes that require CAPTCHA verification
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { getTurnstileErrorMessage, verifyTurnstile } from "./turnstile.js";

export interface CaptchaMiddlewareOptions {
  /** Field name in request body containing the CAPTCHA token */
  tokenField?: string;
  /** Header name containing the CAPTCHA token (alternative to body) */
  tokenHeader?: string;
  /** Expected action for verification */
  expectedAction?: string;
  /** Skip verification in development mode */
  skipInDev?: boolean;
  /** Custom error handler */
  onError?: (c: Context, error: string) => Response;
}

/**
 * Create CAPTCHA verification middleware
 *
 * @example
 * ```ts
 * app.post("/api/register", captchaMiddleware(), async (c) => {
 *   // CAPTCHA verified, proceed with registration
 * });
 * ```
 */
export function captchaMiddleware(options: CaptchaMiddlewareOptions = {}): MiddlewareHandler {
  const {
    tokenField = "captchaToken",
    tokenHeader = "x-captcha-token",
    expectedAction,
    skipInDev = false,
    onError,
  } = options;

  return async (c: Context, next: Next) => {
    // Skip in development if configured
    if (skipInDev && process.env.NODE_ENV === "development") {
      return next();
    }

    // Get token from header or body
    let token: string | undefined;

    // Try header first
    token = c.req.header(tokenHeader);

    // If not in header, try body
    if (!token) {
      try {
        const contentType = c.req.header("content-type");
        if (contentType?.includes("application/json")) {
          const body = await c.req.json();
          token = body[tokenField];
        } else if (contentType?.includes("application/x-www-form-urlencoded")) {
          const formData = await c.req.parseBody();
          token = formData[tokenField] as string;
        }
      } catch {
        // Body parsing failed, continue without token
      }
    }

    if (!token) {
      const errorMessage = "CAPTCHA token is required";
      if (onError) {
        return onError(c, errorMessage);
      }
      return c.json({ error: errorMessage, code: "CAPTCHA_MISSING" }, 400);
    }

    // Get client IP
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0] ||
      c.req.header("x-real-ip");

    // Verify token
    const result = await verifyTurnstile({
      token,
      ...(ip !== undefined ? { ip } : {}),
      ...(expectedAction !== undefined ? { expectedAction } : {}),
    });

    if (!result.success) {
      const errorMessage = getTurnstileErrorMessage(result["error-codes"] || []);
      if (onError) {
        return onError(c, errorMessage);
      }
      return c.json(
        {
          error: "CAPTCHA verification failed",
          code: "CAPTCHA_INVALID",
          details: errorMessage,
        },
        403,
      );
    }

    // Store verification result in context for downstream use
    c.set("captcha", {
      verified: true,
      timestamp: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
    });

    return next();
  };
}

/**
 * Helper to check if request has valid CAPTCHA
 */
export function getCaptchaResult(c: Context):
  | {
      verified: boolean;
      timestamp?: string;
      hostname?: string;
      action?: string;
    }
  | undefined {
  return c.get("captcha");
}

export default captchaMiddleware;
