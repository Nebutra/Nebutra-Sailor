/**
 * Shared API-key helpers for the gateway.
 *
 * The stored key fingerprint is a SHA-256 hex digest of the plaintext key.
 * Centralised so every issue / restore / provision path hashes identically.
 */
import { createHash } from "node:crypto";

/** SHA-256 hex digest of an API key's plaintext — the value stored as the fingerprint. */
// codeql[js/insufficient-password-hash]: API key fingerprint (SHA-256), not password storage
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
