import { createHmac, timingSafeEqual } from "node:crypto";

// =============================================================================
// Webhook Signing & Verification — HMAC-SHA256 with replay protection
// =============================================================================
// Standard webhook signing format compatible with industry practices (Svix, etc.).
// Signature format: "t={unix_seconds},v1={base64_signature}"

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
  if (Number.isNaN(timestampNum)) {
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
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error("Signature verification failed");
    }
  } catch {
    throw new Error("Signature verification failed");
  }

  return true;
}

export interface WebhookReplayStore {
  has(messageId: string): Promise<boolean>;
  set(messageId: string, expiresAt: Date): Promise<void>;
}

export class InMemoryWebhookReplayStore implements WebhookReplayStore {
  private seen = new Map<string, Date>();

  async has(messageId: string): Promise<boolean> {
    const expiresAt = this.seen.get(messageId);
    if (!expiresAt) return false;

    if (expiresAt.getTime() <= Date.now()) {
      this.seen.delete(messageId);
      return false;
    }

    return true;
  }

  async set(messageId: string, expiresAt: Date): Promise<void> {
    this.seen.set(messageId, expiresAt);
  }

  async clear(): Promise<void> {
    this.seen.clear();
  }
}

export interface WebhookReplayGuardOptions {
  store?: WebhookReplayStore;
  toleranceSec?: number;
  now?: () => Date;
}

export interface VerifyOnceOptions {
  payload: string;
  signature: string;
  secret: string;
  messageId: string;
}

export interface WebhookReplayGuard {
  verifyOnce(options: VerifyOnceOptions): Promise<boolean>;
}

export function createReplayGuard(options: WebhookReplayGuardOptions = {}): WebhookReplayGuard {
  const store = options.store ?? new InMemoryWebhookReplayStore();
  const toleranceSec = options.toleranceSec ?? 300;
  const now = options.now ?? (() => new Date());

  return {
    async verifyOnce({
      payload,
      signature,
      secret,
      messageId,
    }: VerifyOnceOptions): Promise<boolean> {
      const parsed = parseWebhookSignatureHeader(signature);
      if (!parsed) {
        throw new Error("Invalid webhook signature header");
      }

      verifyPayload(payload, parsed.signature, secret, parsed.timestamp, toleranceSec);

      if (await store.has(messageId)) {
        throw new Error("Webhook replay detected");
      }

      await store.set(messageId, new Date(now().getTime() + toleranceSec * 1000));
      return true;
    },
  };
}

/**
 * Extract and decode a webhook signature from a standard "Webhook-Signature" header.
 * Expected format: "t={timestamp},v1={signature}"
 *
 * @param headerValue - The "Webhook-Signature" header value
 * @returns { secret, timestamp, signature } or null if format is invalid
 */
export function parseWebhookSignatureHeader(headerValue: string): {
  timestamp: string;
  signature: string;
} | null {
  const entries = Object.fromEntries(
    headerValue.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );

  const timestamp = entries.t;
  const signature = entries.v1;
  return timestamp && signature ? { timestamp, signature } : null;
}

/**
 * Format a signature for the "Webhook-Signature" header.
 * Produces: "t={timestamp},v1={signature}"
 *
 * @param timestamp - Unix timestamp as string
 * @param signature - The HMAC-SHA256 signature (base64)
 * @returns Properly formatted header value
 */
export function formatWebhookSignatureHeader(timestamp: string, signature: string): string {
  return `t=${timestamp},v1=${signature}`;
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
