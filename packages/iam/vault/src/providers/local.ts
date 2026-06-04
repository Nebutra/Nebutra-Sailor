import { randomUUID } from "node:crypto";
import { logger } from "@nebutra/logger";
import { aesDecrypt, aesEncrypt, deriveKey, fromBase64, generateKey, toBase64 } from "../crypto.js";
import type {
  EncryptedSecret,
  EncryptOptions,
  LocalProviderConfig,
  VaultProvider,
} from "../types.js";

// =============================================================================
// Local Vault Provider
// =============================================================================
// Uses VAULT_LOCAL_MASTER_KEY or VAULT_MASTER_KEY (from env or config) to derive a KEK via HKDF.
// Simpler than KMS but suitable for dev/self-hosted environments.
//
// Flow:
// 1. Derive KEK from master key using HKDF (+ optional salt)
// 2. Generate random DEK (32 bytes)
// 3. Encrypt DEK with KEK using AES-256-GCM
// 4. Encrypt secret with DEK using AES-256-GCM
// 5. Store encrypted DEK + encrypted secret
// =============================================================================

/** Minimum master-key length in bytes (AES-256 key size). */
const MASTER_KEY_MIN_BYTES = 32;

export class LocalProvider implements VaultProvider {
  readonly name = "local" as const;

  private masterKey: Buffer;
  private salt: Buffer;
  private keyVersion: number;

  constructor(config: LocalProviderConfig) {
    const masterKeyStr = config.masterKey ?? getLocalMasterKeyFromEnv();
    if (!masterKeyStr) {
      throw new Error(
        "Master key required. Set VAULT_LOCAL_MASTER_KEY or VAULT_MASTER_KEY env var, or pass masterKey in config.",
      );
    }

    this.masterKey = Buffer.from(masterKeyStr, "utf-8");

    // Entropy floor: the master key seeds HKDF for every derived KEK. A key
    // shorter than the AES-256 key length (32 bytes) cannot carry 256 bits of
    // entropy and dangerously weakens every secret. Fail fast at startup rather
    // than silently encrypting under a weak key.
    if (this.masterKey.length < MASTER_KEY_MIN_BYTES) {
      throw new Error(
        `Vault master key too short: ${this.masterKey.length} bytes, need at least ${MASTER_KEY_MIN_BYTES}. ` +
          "Set VAULT_LOCAL_MASTER_KEY / VAULT_MASTER_KEY to a value with at least 32 bytes of entropy.",
      );
    }

    this.salt = config.salt ?? Buffer.from("nebutra-vault", "utf-8");
    this.keyVersion = config.keyVersion ?? 1;

    logger.debug("[vault:local] Initialized", { keyVersion: this.keyVersion });
  }

  /**
   * Build the Additional Authenticated Data for a v2 envelope.
   *
   * Binds the tenant and KEK version into the GCM tag so a ciphertext cannot be
   * replayed under a different tenant or key version. Stable, deterministic
   * encoding — the same inputs must produce identical bytes on encrypt and
   * decrypt. A missing tenant is encoded distinctly from an empty-string tenant.
   */
  private buildAad(tenantId: string | undefined, keyVersion: number): Buffer {
    return Buffer.from(`v2|tenant=${tenantId ?? ""}|kek=${keyVersion}`, "utf-8");
  }

  /**
   * Derive the KEK from master key using HKDF.
   * Includes keyVersion in the info parameter for rotation support.
   */
  private async deriveKek(): Promise<Buffer> {
    const info = Buffer.from(`nebutra-vault-kek-v${this.keyVersion}`, "utf-8");
    return deriveKey(this.masterKey, this.salt, info);
  }

  /**
   * Encrypt a plaintext secret.
   * 1. Derive KEK from master key
   * 2. Generate random DEK
   * 3. Encrypt DEK with KEK
   * 4. Encrypt secret with DEK
   */
  async encrypt(plaintext: string, options?: EncryptOptions): Promise<EncryptedSecret> {
    try {
      // 1. Derive KEK from master key
      const kek = await this.deriveKek();

      // 2. Generate random DEK
      const plainDek = generateKey(32);

      // New writes use the v2 envelope: bind tenantId + keyVersion as AAD on
      // both GCM layers so a ciphertext (and its wrapped DEK) cannot be replayed
      // under a different tenant or key version.
      const aad = this.buildAad(options?.tenantId, this.keyVersion);

      // 3. Encrypt DEK with KEK (AAD-bound)
      const dekEncryptResult = aesEncrypt(plainDek, kek, aad);

      // 4. Encrypt secret with plaintext DEK (AAD-bound)
      const secretEncryptResult = aesEncrypt(plaintext, plainDek, aad);

      // Construct encrypted secret
      const encrypted: EncryptedSecret = {
        id: options?.id ?? randomUUID(),
        ciphertext: toBase64(secretEncryptResult.ciphertext),
        encryptedDek: toBase64(dekEncryptResult.ciphertext),
        iv: toBase64(secretEncryptResult.iv),
        authTag: toBase64(secretEncryptResult.authTag),
        dekIv: toBase64(dekEncryptResult.iv),
        dekAuthTag: toBase64(dekEncryptResult.authTag),
        keyVersion: this.keyVersion,
        envelopeVersion: 2,
        algorithm: "aes-256-gcm",
        ...(options?.tenantId !== undefined ? { tenantId: options.tenantId } : {}),
        ...(options?.metadata !== undefined ? { metadata: options.metadata } : {}),
        createdAt: new Date().toISOString(),
      };

      logger.debug("[vault:local] Secret encrypted", {
        id: encrypted.id,
        tenantId: options?.tenantId,
      });
      return encrypted;
    } catch (error) {
      logger.error("[vault:local] Encryption failed", { error });
      throw new Error(
        `Local vault encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrypt an encrypted secret.
   * 1. Derive KEK from master key
   * 2. Decrypt DEK with KEK
   * 3. Decrypt secret with DEK
   */
  async decrypt(encrypted: EncryptedSecret, options?: { tenantId?: string }): Promise<string> {
    try {
      // Validate tenant ID if provided
      if (options?.tenantId && encrypted.tenantId && encrypted.tenantId !== options.tenantId) {
        throw new Error("Tenant ID mismatch");
      }

      // Validate key version compatibility
      if (encrypted.keyVersion !== this.keyVersion) {
        logger.warn("[vault:local] Key version mismatch", {
          secretVersion: encrypted.keyVersion,
          currentVersion: this.keyVersion,
        });
        // Still allow decryption with old key version for backward compatibility
        // (in production, you might want stricter validation)
      }

      // 1. Derive KEK (using the version stored in the secret)
      const info = Buffer.from(`nebutra-vault-kek-v${encrypted.keyVersion}`, "utf-8");
      const kek = await deriveKey(this.masterKey, this.salt, info);

      // Version dispatch: v2 envelopes bind tenantId + keyVersion as AAD; legacy
      // envelopes (absent envelopeVersion) carry no AAD and MUST decrypt via the
      // exact original no-AAD path. The AAD is recomputed from the values stored
      // in the envelope itself (what `encrypt` wrote), not the caller's options.
      const aad =
        encrypted.envelopeVersion === 2
          ? this.buildAad(encrypted.tenantId, encrypted.keyVersion)
          : undefined;

      // 2. Decrypt DEK with KEK
      // For backward compatibility, support secrets without dekIv/dekAuthTag
      let plainDek: Buffer;
      if (encrypted.dekIv && encrypted.dekAuthTag) {
        plainDek = aesDecrypt(
          fromBase64(encrypted.encryptedDek),
          kek,
          {
            iv: fromBase64(encrypted.dekIv),
            authTag: fromBase64(encrypted.dekAuthTag),
          },
          aad,
        );
      } else {
        // Fallback for older secrets — this shouldn't happen in production
        throw new Error(
          "Encrypted DEK missing IV/authTag — cannot decrypt. Re-encrypt with current version.",
        );
      }

      // 3. Decrypt secret with DEK
      const plaintext = aesDecrypt(
        fromBase64(encrypted.ciphertext),
        plainDek,
        {
          iv: fromBase64(encrypted.iv),
          authTag: fromBase64(encrypted.authTag),
        },
        aad,
      );

      logger.debug("[vault:local] Secret decrypted", {
        id: encrypted.id,
        tenantId: options?.tenantId,
      });
      return plaintext.toString("utf-8");
    } catch (error) {
      logger.error("[vault:local] Decryption failed", { error });
      throw new Error(
        `Local vault decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Rotate a secret in place — generates new DEK, re-encrypts data.
   */
  async rotateKey(encrypted: EncryptedSecret): Promise<EncryptedSecret> {
    try {
      // Decrypt the old secret
      const plaintext = await this.decrypt(encrypted);

      // Re-encrypt with new DEK
      const reencrypted = await this.encrypt(plaintext, {
        id: encrypted.id,
        ...(encrypted.tenantId !== undefined ? { tenantId: encrypted.tenantId } : {}),
        ...(encrypted.metadata !== undefined
          ? {
              metadata: {
                name: encrypted.metadata.name,
                type: encrypted.metadata.type,
                ...(encrypted.metadata.expiresAt !== undefined
                  ? { expiresAt: encrypted.metadata.expiresAt }
                  : {}),
              },
            }
          : {}),
      });

      // Update rotation timestamp
      reencrypted.rotatedAt = new Date().toISOString();

      logger.debug("[vault:local] Key rotated", { id: encrypted.id });
      return reencrypted;
    } catch (error) {
      logger.error("[vault:local] Key rotation failed", { error });
      throw new Error(
        `Key rotation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Rotate the KEK by incrementing version.
   * Future encryptions will use the new version, but old secrets remain decryptable
   * via their stored keyVersion.
   */
  async rotateKek(): Promise<void> {
    this.keyVersion += 1;
    logger.info("[vault:local] KEK rotated", { newVersion: this.keyVersion });
  }

  /**
   * Generate a new data encryption key (plaintext).
   */
  async generateDek(): Promise<Buffer> {
    return generateKey(32);
  }

  /**
   * Graceful shutdown.
   */
  async close(): Promise<void> {
    logger.debug("[vault:local] Closed");
  }
}

function getLocalMasterKeyFromEnv(): string | undefined {
  const legacyKey = process.env.VAULT_MASTER_KEY;
  const localKey = process.env.VAULT_LOCAL_MASTER_KEY;

  if (legacyKey && localKey && legacyKey !== localKey) {
    throw new Error(
      "Vault local key mismatch: VAULT_MASTER_KEY and VAULT_LOCAL_MASTER_KEY are both set but differ.",
    );
  }

  return localKey ?? legacyKey;
}
