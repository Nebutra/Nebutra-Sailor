import { randomUUID } from "node:crypto";
import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { logger } from "@nebutra/logger";
import { aesDecrypt, aesEncrypt, fromBase64, toBase64 } from "../crypto.js";
import type { AWSKMSProviderConfig, EncryptedSecret, VaultProvider } from "../types.js";

// =============================================================================
// AWS KMS Vault Provider
// =============================================================================
// Uses AWS KMS for DEK/KEK management:
// - GenerateDataKey: KMS generates plaintext DEK + encrypted DEK (by KEK)
// - Encrypt: plaintext DEK encrypts the secret using AES-256-GCM
// - Decrypt: KMS decrypts the DEK, then DEK decrypts the secret
// - Key rotation: generate new DEK, re-encrypt data, update encryptedDek
// =============================================================================

export class AWSKMSProvider implements VaultProvider {
  readonly name = "aws-kms" as const;

  private client: KMSClient;
  private keyId: string;
  private keyVersion: number;

  constructor(config: AWSKMSProviderConfig) {
    const keyId = config.keyId ?? process.env.AWS_KMS_KEY_ID ?? process.env.AWS_KMS_KEY_ARN;
    if (!keyId) {
      throw new Error(
        "AWS KMS Key ID or ARN required. Set AWS_KMS_KEY_ID or pass keyId in config.",
      );
    }

    this.keyId = keyId;
    this.keyVersion = config.keyVersion ?? 1;

    const region = config.region ?? process.env.AWS_REGION ?? "us-east-1";

    this.client = new KMSClient({
      region,
      ...(config.credentials && {
        credentials: {
          accessKeyId: config.credentials.accessKeyId,
          secretAccessKey: config.credentials.secretAccessKey,
        },
      }),
    });

    logger.debug("[vault:aws-kms] Initialized", { keyId, region, keyVersion: this.keyVersion });
  }

  /**
   * Encrypt a plaintext secret using AWS KMS.
   * 1. KMS generates plaintext DEK + encrypted DEK
   * 2. Use plaintext DEK to encrypt secret with AES-256-GCM
   * 3. Store encrypted DEK (never plaintext DEK)
   */
  async encrypt(
    plaintext: string,
    options?: { id?: string; tenantId?: string; metadata?: unknown },
  ): Promise<EncryptedSecret> {
    try {
      // 1. Generate DEK from AWS KMS
      const generateDekResult = await this.client.send(
        new GenerateDataKeyCommand({
          KeyId: this.keyId,
          KeySpec: "AES_256",
        }),
      );

      const plaintextDek = generateDekResult.Plaintext as Buffer;
      const encryptedDekBuffer = generateDekResult.CiphertextBlob as Buffer;

      if (!plaintextDek || !encryptedDekBuffer) {
        throw new Error("AWS KMS GenerateDataKey returned empty DEK");
      }

      // 2. Encrypt the secret with the plaintext DEK using AES-256-GCM
      const encryptResult = aesEncrypt(plaintext, plaintextDek);

      // 3. Construct encrypted secret (plaintext DEK is NOT stored)
      const encrypted: EncryptedSecret = {
        id: options?.id ?? randomUUID(),
        ciphertext: toBase64(encryptResult.ciphertext),
        encryptedDek: toBase64(encryptedDekBuffer),
        iv: toBase64(encryptResult.iv),
        authTag: toBase64(encryptResult.authTag),
        keyVersion: this.keyVersion,
        algorithm: "aes-256-gcm",
        ...(options?.tenantId !== undefined ? { tenantId: options.tenantId } : {}),
        metadata: options?.metadata as any,
        createdAt: new Date().toISOString(),
      };

      logger.debug("[vault:aws-kms] Secret encrypted", {
        id: encrypted.id,
        tenantId: options?.tenantId,
      });
      return encrypted;
    } catch (error) {
      logger.error("[vault:aws-kms] Encryption failed", { error });
      throw new Error(
        `AWS KMS encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrypt an encrypted secret using AWS KMS.
   * 1. KMS decrypts the encrypted DEK to plaintext DEK
   * 2. Use plaintext DEK to decrypt secret with AES-256-GCM
   */
  async decrypt(encrypted: EncryptedSecret, options?: { tenantId?: string }): Promise<string> {
    try {
      // Validate tenant ID if provided
      if (options?.tenantId && encrypted.tenantId && encrypted.tenantId !== options.tenantId) {
        throw new Error("Tenant ID mismatch");
      }

      // 1. KMS decrypts the encrypted DEK
      const decryptResult = await this.client.send(
        new DecryptCommand({
          CiphertextBlob: fromBase64(encrypted.encryptedDek),
        }),
      );

      const plaintextDek = decryptResult.Plaintext as Buffer;
      if (!plaintextDek) {
        throw new Error("AWS KMS Decrypt returned empty DEK");
      }

      // 2. Decrypt the secret with the plaintext DEK
      const plaintext = aesDecrypt(fromBase64(encrypted.ciphertext), plaintextDek, {
        iv: fromBase64(encrypted.iv),
        authTag: fromBase64(encrypted.authTag),
      });

      logger.debug("[vault:aws-kms] Secret decrypted", {
        id: encrypted.id,
        tenantId: options?.tenantId,
      });
      return plaintext.toString("utf-8");
    } catch (error) {
      logger.error("[vault:aws-kms] Decryption failed", { error });
      throw new Error(
        `AWS KMS decryption failed: ${error instanceof Error ? error.message : String(error)}`,
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
        metadata: encrypted.metadata,
      });

      // Update rotation timestamp
      reencrypted.rotatedAt = new Date().toISOString();

      logger.debug("[vault:aws-kms] Key rotated", { id: encrypted.id });
      return reencrypted;
    } catch (error) {
      logger.error("[vault:aws-kms] Key rotation failed", { error });
      throw new Error(
        `Key rotation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Rotate the KEK (AWS KMS handles this automatically).
   * Incrementing keyVersion is for application tracking; AWS KMS key rotation
   * is managed via AWS CMK rotation policy.
   */
  async rotateKek(): Promise<void> {
    this.keyVersion += 1;
    logger.info("[vault:aws-kms] KEK rotated", { newVersion: this.keyVersion });
  }

  /**
   * Generate a new data encryption key (plaintext).
   * Useful for manual key management or testing.
   */
  async generateDek(): Promise<Buffer> {
    try {
      const result = await this.client.send(
        new GenerateDataKeyCommand({
          KeyId: this.keyId,
          KeySpec: "AES_256",
        }),
      );

      return result.Plaintext as Buffer;
    } catch (error) {
      logger.error("[vault:aws-kms] DEK generation failed", { error });
      throw new Error(
        `DEK generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Graceful shutdown.
   */
  async close(): Promise<void> {
    this.client.destroy();
    logger.debug("[vault:aws-kms] Closed");
  }
}
