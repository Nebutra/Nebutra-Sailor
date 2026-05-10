import { createCipheriv, createDecipheriv, hkdf, randomBytes } from "node:crypto";
import type { AesDecryptOptions, AesEncryptResult } from "./types";

// =============================================================================
// Cryptographic utilities for vault operations
// =============================================================================

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * AES-256-GCM encryption.
 * @param plaintext Data to encrypt
 * @param key 32-byte encryption key
 * @returns Ciphertext, IV, and authentication tag (all as Buffers)
 */
export function aesEncrypt(plaintext: string | Buffer, key: Buffer): AesEncryptResult {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const plainBuf = typeof plaintext === "string" ? Buffer.from(plaintext, "utf-8") : plaintext;
  let ciphertext = cipher.update(plainBuf);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag };
}

/**
 * AES-256-GCM decryption.
 * @param ciphertext Data to decrypt
 * @param key 32-byte encryption key
 * @param options IV and authentication tag
 * @returns Decrypted plaintext as Buffer
 */
export function aesDecrypt(ciphertext: Buffer, key: Buffer, options: AesDecryptOptions): Buffer {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, options.iv);
  decipher.setAuthTag(options.authTag);

  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext;
}

/**
 * HKDF-SHA256 key derivation (RFC 5869).
 * Derives a KEK from a master key using HKDF.
 *
 * @param masterKey Master secret
 * @param salt Optional salt (randomly generated if omitted)
 * @param info Optional context information
 * @returns Promise resolving to derived key (32 bytes)
 */
export function deriveKey(
  masterKey: Buffer | string,
  salt?: Buffer,
  info?: Buffer,
): Promise<Buffer> {
  const master = typeof masterKey === "string" ? Buffer.from(masterKey, "utf-8") : masterKey;

  return new Promise((resolve, reject) => {
    hkdf(
      "sha256",
      master,
      salt ?? Buffer.alloc(0),
      info ?? Buffer.alloc(0),
      KEY_LENGTH,
      (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(Buffer.from(derivedKey));
        }
      },
    );
  });
}

/**
 * Generate a cryptographically secure random key.
 * @param length Key length in bytes (default: 32 for AES-256)
 * @returns Random key as Buffer
 */
export function generateKey(length: number = KEY_LENGTH): Buffer {
  return randomBytes(length);
}

/**
 * Generate a random IV for AES-GCM.
 * @returns Random IV (12 bytes)
 */
export function generateIv(): Buffer {
  return randomBytes(IV_LENGTH);
}

/**
 * Convert Buffer to base64 string.
 */
export function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

/**
 * Convert base64 string to Buffer.
 */
export function fromBase64(str: string): Buffer {
  return Buffer.from(str, "base64");
}
