import { z } from "zod";

// =============================================================================
// Core Vault Abstraction — Envelope encryption for application-layer secrets
// =============================================================================

/**
 * Supported vault backend providers.
 *
 * - `aws-kms`  — AWS KMS-backed DEK/KEK management (production)
 * - `local`    — Local KEK derivation from VAULT_MASTER_KEY (dev/self-hosted)
 */
export type VaultProviderType = "aws-kms" | "local";

// ── Secret Encryption ───────────────────────────────────────────────────────

/**
 * Encrypted secret with envelope encryption metadata.
 * Stores plaintext DEK (encrypted with KEK) + encrypted secret payload.
 */
export const EncryptedSecretSchema = z.object({
  /** Unique secret identifier */
  id: z.string(),

  /** AES-256-GCM encrypted plaintext (base64) */
  ciphertext: z.string(),

  /** KEK-encrypted data encryption key (base64) */
  encryptedDek: z.string(),

  /** Initialization vector for secret encryption (base64) */
  iv: z.string(),

  /** Authentication tag for secret encryption (base64) */
  authTag: z.string(),

  /** Initialization vector for DEK encryption (base64, optional for backward compat) */
  dekIv: z.string().optional(),

  /** Authentication tag for DEK encryption (base64, optional for backward compat) */
  dekAuthTag: z.string().optional(),

  /** KEK version or rotation counter */
  keyVersion: z.number().int().min(1),

  /** Encryption algorithm identifier */
  algorithm: z.literal("aes-256-gcm"),

  /** Optional tenant ID for multi-tenant isolation */
  tenantId: z.string().optional(),

  /** Secret metadata */
  metadata: z
    .object({
      name: z.string(),
      type: z.enum(["api_key", "oauth_token", "credential", "certificate", "generic"]),
      expiresAt: z.string().datetime().optional(),
    })
    .optional(),

  /** ISO-8601 creation timestamp */
  createdAt: z.string().datetime(),

  /** ISO-8601 last rotation timestamp */
  rotatedAt: z.string().datetime().optional(),
});

export type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>;

// ── Secret Metadata ─────────────────────────────────────────────────────────

export const SecretMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  tenantId: z.string().optional(),
  type: z.enum(["api_key", "oauth_token", "credential", "certificate", "generic"]),
  createdAt: z.string().datetime(),
  rotatedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type SecretMetadata = z.infer<typeof SecretMetadataSchema>;

// ── Encryption/Decryption Options ───────────────────────────────────────────

export interface EncryptOptions {
  /** Secret identifier (auto-generated if omitted) */
  id?: string;

  /** Tenant ID for multi-tenant isolation */
  tenantId?: string;

  /** Secret metadata (name, type, expiry) */
  metadata?: {
    name: string;
    type: "api_key" | "oauth_token" | "credential" | "certificate" | "generic";
    expiresAt?: string;
  };
}

export interface DecryptOptions {
  /** Verify tenant ID matches (optional isolation) */
  tenantId?: string;
}

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every vault backend must implement this interface.
 * The factory function (`createVault`) returns a `VaultProvider`.
 */
export interface VaultProvider {
  readonly name: VaultProviderType;

  /**
   * Encrypt a plaintext secret.
   * Returns an EncryptedSecret with DEK + ciphertext + metadata.
   */
  encrypt(plaintext: string, options?: EncryptOptions): Promise<EncryptedSecret>;

  /**
   * Decrypt an EncryptedSecret back to plaintext.
   * Verifies tenant ID if provided in options.
   */
  decrypt(encrypted: EncryptedSecret, options?: DecryptOptions): Promise<string>;

  /**
   * Rotate a secret in place — generates new DEK, re-encrypts data.
   * Returns new EncryptedSecret with same plaintext.
   */
  rotateKey(encrypted: EncryptedSecret): Promise<EncryptedSecret>;

  /**
   * Rotate the KEK (key encryption key) — re-wraps all DEKs.
   * Implementation-dependent: AWS KMS auto-manages, local increments version.
   */
  rotateKek(): Promise<void>;

  /**
   * Generate a new data encryption key (plaintext).
   * Used for manual key management or testing.
   */
  generateDek(): Promise<Buffer>;

  /**
   * Graceful shutdown — close KMS connections, cleanup resources.
   */
  close(): Promise<void>;
}

// ── AWS KMS Provider Config ──────────────────────────────────────────────────

export interface AWSKMSProviderConfig {
  provider: "aws-kms";

  /** AWS KMS Key ID or ARN (defaults to `process.env.AWS_KMS_KEY_ID`) */
  keyId?: string;

  /** AWS region (defaults to `process.env.AWS_REGION` or "us-east-1") */
  region?: string;

  /** Optional AWS credentials (auto-detect from env if omitted) */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };

  /** KEK version for rotation tracking (default: 1) */
  keyVersion?: number;
}

// ── Local Provider Config ────────────────────────────────────────────────────

export interface LocalProviderConfig {
  provider: "local";

  /** Master key for KEK derivation (defaults to `process.env.VAULT_MASTER_KEY`) */
  masterKey?: string;

  /** HKDF salt (optional, auto-generated if omitted) */
  salt?: Buffer;

  /** KEK version for rotation (default: 1) */
  keyVersion?: number;
}

// ── Factory Config ──────────────────────────────────────────────────────────

export type VaultConfig = AWSKMSProviderConfig | LocalProviderConfig;

// ── Crypto Options (internal) ────────────────────────────────────────────────

export interface AesEncryptResult {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface AesDecryptOptions {
  iv: Buffer;
  authTag: Buffer;
}
