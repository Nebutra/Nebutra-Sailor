import { createHmac, timingSafeEqual } from "crypto";

// =============================================================================
// Webhook Signing & Verification — HMAC-SHA256 with replay protection
// =============================================================================
// Standard webhook signing format compatible with industry practices (Svix, etc.).
// Signature format: "whsec_MjAxNDAxMDExMDIwMzA0MDAxMDIwMzA0MA==.{base64_signature}"

/**
 * Sign a webhook payload with a secret.
 *
 * @param payload - The JSON payload being signed (as string)
 * @param secret - The signing secret (raw bytes encoded as base64 or hex)
 * @param timestamp - Unix timestamp (seconds since epoch, as string)
 * @returns Signature string (base64-encoded HMAC-SHA256)
 */
export function signPayload(payload: string, secret: string, timestamp: string): string {
  // Decode the secret (assume base64 format for compatibility with Svix)
  const secretBytes = Buffer.from(secret, "base64");

  // Create signed content: "{timestamp}.{payload}"
  const signedContent = `${timestamp}.${payload}`;

  // HMAC-SHA256 the signed content
  const hmac = createHmac("sha256", secretBytes);
  hmac.update(signedContent, "utf8");
  const signature = hmac.digest("base64");

  return signature;
}

/**
 * Verify a webhook signature with replay attack protection.
 *
 * @param payload - The JSON payload (as string)
 * @param signature - The signature string (base64-encoded HMAC-SHA256)
 * @param secret - The signing secret
 * @param timestamp - The timestamp from the webhook header (Unix seconds)
 * @param toleranceSec - Maximum age of timestamp in seconds (default: 300 = 5 minutes)
 * @returns true if signature is valid and timestamp is recent, throws otherwise
 */
export function verifyPayload(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string,
  toleranceSec: number = 300,
): boolean {
  // 1. Verify timestamp is recent (replay attack protection)
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    throw new Error("Invalid timestamp format");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ageSec = nowSec - timestampNum;

  if (ageSec < 0) {
    throw new Error("Timestamp is in the future (clock skew?)");
  }

  if (ageSec > toleranceSec) {
    throw new Error(`Timestamp is too old: ${ageSec}s > ${toleranceSec}s tolerance`);
  }

  // 2. Verify the signature itself
  const expectedSignature = signPayload(payload, secret, timestamp);

  // Use timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(expectedSignature, "utf8");
    const actual = Buffer.from(signature, "utf8");
    timingSafeEqual(expected, actual);
  } catch {
    throw new Error("Signature verification failed");
  }

  return true;
}

/**
 * Extract and decode a webhook signature from a standard "Webhook-Signature" header.
 * Expected format: "whsec_{base64_encoded_secret}.{timestamp}.{signature}"
 *
 * @param headerValue - The "Webhook-Signature" header value
 * @returns { secret, timestamp, signature } or null if format is invalid
 */
export function parseWebhookSignatureHeader(headerValue: string): {
  secret: string;
  timestamp: string;
  signature: string;
} | null {
  // Remove "whsec_" prefix if present
  let parts = headerValue;
  if (parts.startsWith("whsec_")) {
    parts = parts.slice(6);
  }

  const tokens = parts.split(".");
  if (tokens.length !== 3) {
    return null;
  }

  const [secret, timestamp, signature] = tokens as [string, string, string];
  return { secret, timestamp, signature };
}

/**
 * Format a signature for the "Webhook-Signature" header.
 * Produces: "whsec_{secret}.{timestamp}.{signature}"
 *
 * @param secret - The secret (base64)
 * @param timestamp - Unix timestamp as string
 * @param signature - The HMAC-SHA256 signature (base64)
 * @returns Properly formatted header value
 */
export function formatWebhookSignatureHeader(
  secret: string,
  timestamp: string,
  signature: string,
): string {
  return `whsec_${secret}.${timestamp}.${signature}`;
}

/**
 * Generate a new random webhook secret (base64-encoded).
 * Standard: 32 bytes = 256 bits of entropy.
 *
 * @returns Base64-encoded random secret
 */
export function generateSecret(): string {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(buf).toString("base64");
}
