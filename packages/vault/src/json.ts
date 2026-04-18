import { getVault } from "./factory";
import type { EncryptedSecret } from "./types";

// =============================================================================
// JSON envelope helpers — convenience wrappers around getVault().encrypt/decrypt
// for encrypting arbitrary JSON-serializable values.
// =============================================================================
//
// These helpers are the canonical way for application code to encrypt structured
// data (e.g. integration credentials, settings) at rest. The returned
// EncryptedSecret can be stored in a Prisma `Json` column and round-tripped back
// to the original value.
//
// Usage:
//   const encrypted = await encryptJSON({ apiKey: "..." }, { tenantId: "org_123" });
//   // store `encrypted` in DB
//   const value = await decryptJSON<MyShape>(encrypted, { tenantId: "org_123" });
//
// The `context` map is included as additional context (AAD-like integrity check)
// by being embedded in the `metadata` envelope. For the current providers
// (`local`, `aws-kms`), the `tenantId` is verified on decrypt via the provider's
// built-in tenant mismatch check. Other context keys (e.g. `kind`) are stored
// with the secret for auditability but are not part of the AEAD tag — if
// stronger binding is needed in future, providers can be extended to hash
// `context` into the AAD.
// =============================================================================

export interface EncryptJSONOptions {
  /** Stable identifier for the secret — auto-generated if omitted. */
  id?: string;

  /**
   * Context bound to this ciphertext.
   * `tenantId` is the primary isolation key: the vault provider rejects
   * decryption if the caller's tenantId doesn't match.
   * Other keys are stored alongside the secret for traceability.
   */
  context?: Record<string, string>;
}

export interface DecryptJSONOptions {
  /** Verify the ciphertext was encrypted for this tenant. */
  context?: Record<string, string>;
}

/**
 * Encrypt an arbitrary JSON-serializable value.
 *
 * Returns the full `EncryptedSecret` envelope (base64 ciphertext + DEK + IVs +
 * key version). Store it in a Prisma `Json` column.
 *
 * @throws if `value` cannot be serialized with `JSON.stringify`.
 */
export async function encryptJSON<T>(
  value: T,
  options: EncryptJSONOptions = {},
): Promise<EncryptedSecret> {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("[vault] Cannot encrypt undefined — value must be JSON-serializable");
  }

  const vault = await getVault();
  const tenantId = options.context?.tenantId;
  const kind = options.context?.kind;

  return vault.encrypt(serialized, {
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(tenantId !== undefined ? { tenantId } : {}),
    metadata: {
      name: kind ?? "json",
      type: "credential",
    },
  });
}

/**
 * Decrypt an `EncryptedSecret` back to its original JSON value.
 *
 * If `options.context.tenantId` is provided, the provider verifies it matches
 * the tenantId embedded in the ciphertext and throws on mismatch.
 *
 * @throws on tampering, wrong tenant, or JSON.parse failure.
 */
export async function decryptJSON<T = unknown>(
  cipher: EncryptedSecret,
  options: DecryptJSONOptions = {},
): Promise<T> {
  const vault = await getVault();
  const tenantId = options.context?.tenantId;

  const plaintext = await vault.decrypt(cipher, tenantId !== undefined ? { tenantId } : undefined);

  try {
    return JSON.parse(plaintext) as T;
  } catch (error) {
    throw new Error(
      `[vault] decryptJSON: failed to parse decrypted payload as JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Type guard — check whether a Prisma `Json` value looks like an
 * `EncryptedSecret` envelope. Used by DB middleware and migration scripts
 * to distinguish plaintext legacy rows from encrypted ones.
 */
export function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ciphertext === "string" &&
    typeof v.encryptedDek === "string" &&
    typeof v.iv === "string" &&
    typeof v.authTag === "string" &&
    typeof v.keyVersion === "number" &&
    v.algorithm === "aes-256-gcm"
  );
}
