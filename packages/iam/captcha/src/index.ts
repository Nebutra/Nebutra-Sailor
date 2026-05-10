/**
 * @nebutra/captcha
 *
 * CAPTCHA integration for Nebutra using Cloudflare Turnstile
 *
 * @example React component
 * ```tsx
 * import { Turnstile } from "@nebutra/captcha/react";
 *
 * <Turnstile
 *   onSuccess={(token) => setToken(token)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 *
 * @example Server verification (Hono middleware)
 * ```ts
 * import { captchaMiddleware } from "@nebutra/captcha/server";
 *
 * app.post("/api/register", captchaMiddleware(), async (c) => {
 *   // CAPTCHA verified
 * });
 * ```
 *
 * @example Direct verification
 * ```ts
 * import { verifyTurnstile } from "@nebutra/captcha/server";
 *
 * const result = await verifyTurnstile({ token, ip });
 * if (!result.success) {
 *   throw new Error("CAPTCHA failed");
 * }
 * ```
 */

export type { TurnstileProps, TurnstileRef } from "./react/index.js";
// Re-export types for convenience
export type {
  CaptchaMiddlewareOptions,
  TurnstileVerifyResult,
  VerifyOptions,
} from "./server/index.js";
