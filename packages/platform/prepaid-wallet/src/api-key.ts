import { createHash, randomBytes } from "node:crypto";
import { API_KEY_PREFIX, DEFAULT_PRODUCT_SCOPES } from "./scopes";

export interface IssuedApiKey {
  /** Full secret — show once, never store plaintext. */
  readonly fullKey: string;
  /** SHA-256 hex fingerprint for storage (matches gateway hashApiKey). */
  readonly keyHash: string;
  /** Short prefix for UI display. */
  readonly keyPrefix: string;
  readonly scopes: readonly string[];
}

/** SHA-256 hex digest — same algorithm as backends/gateway `hashApiKey`. */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKeyPlaintext(prefix: string = API_KEY_PREFIX): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

/**
 * Issue a new API key material. Persist only `keyHash` + metadata.
 */
export function issueApiKey(options?: {
  readonly prefix?: string;
  readonly scopes?: readonly string[];
}): IssuedApiKey {
  const fullKey = generateApiKeyPlaintext(options?.prefix ?? API_KEY_PREFIX);
  const scopes = options?.scopes ?? DEFAULT_PRODUCT_SCOPES;
  return {
    fullKey,
    keyHash: hashApiKey(fullKey),
    keyPrefix: fullKey.slice(0, 12),
    scopes: [...scopes],
  };
}

export function isApiKeyFormat(plaintext: string): boolean {
  return plaintext.startsWith(API_KEY_PREFIX) && plaintext.length > API_KEY_PREFIX.length + 16;
}
