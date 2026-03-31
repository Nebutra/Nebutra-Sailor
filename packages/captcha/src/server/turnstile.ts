/**
 * Cloudflare Turnstile Server-side Verification
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}

export interface VerifyOptions {
  /** The Turnstile token from the client */
  token: string;
  /** The user's IP address (optional but recommended) */
  ip?: string;
  /** The secret key (defaults to env var) */
  secretKey?: string;
  /** Expected action (if using action parameter) */
  expectedAction?: string;
}

/**
 * Verify a Turnstile token
 */
export async function verifyTurnstile(options: VerifyOptions): Promise<TurnstileVerifyResult> {
  const secretKey = options.secretKey || process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }

  const formData = new URLSearchParams();
  formData.append("secret", secretKey);
  formData.append("response", options.token);

  if (options.ip) {
    formData.append("remoteip", options.ip);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification request failed: ${response.status}`);
  }

  const result: TurnstileVerifyResult = await response.json();

  // Optionally verify the action matches
  if (options.expectedAction && result.action !== options.expectedAction) {
    return {
      ...result,
      success: false,
      "error-codes": [...(result["error-codes"] || []), "action-mismatch"],
    };
  }

  return result;
}

/**
 * Simple verify helper that returns boolean
 */
export async function isTurnstileValid(token: string, ip?: string): Promise<boolean> {
  try {
    const result = await verifyTurnstile({ token, ...(ip !== undefined ? { ip } : {}) });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Error codes mapping
 */
export const TURNSTILE_ERROR_MESSAGES: Record<string, string> = {
  "missing-input-secret": "The secret parameter was not passed.",
  "invalid-input-secret": "The secret parameter was invalid or did not exist.",
  "missing-input-response": "The response parameter was not passed.",
  "invalid-input-response": "The response parameter is invalid or has expired.",
  "bad-request": "The request was rejected because it was malformed.",
  "timeout-or-duplicate": "The response parameter has already been validated before.",
  "internal-error": "An internal error happened while validating the response.",
  "action-mismatch": "The action parameter did not match the expected value.",
};

export function getTurnstileErrorMessage(errorCodes: string[]): string {
  const messages = errorCodes.map((code) => TURNSTILE_ERROR_MESSAGES[code] || code).join(", ");
  return messages || "CAPTCHA verification failed";
}
