// =============================================================================
// @nebutra/vault — Application-layer secrets vault with envelope encryption
// =============================================================================
// Supports:
//   - AWS KMS       (production, AWS-managed KEK)
//   - Local         (dev/self-hosted, HKDF-derived KEK)
//
// Usage:
//   import { getVault } from "@nebutra/vault";
//
//   const vault = await getVault();  // auto-detects provider
//   const encrypted = await vault.encrypt("my-secret-api-key");
//   const plaintext = await vault.decrypt(encrypted);
// =============================================================================

// ── Crypto utilities (internal, but exported for advanced use) ──────────────
export {
  aesDecrypt,
  aesEncrypt,
  deriveKey,
  fromBase64,
  generateIv,
  generateKey,
  toBase64,
} from "./crypto.js";
// ── Factory ─────────────────────────────────────────────────────────────────
export {
  closeVault,
  createVault,
  getVault,
  setVault,
} from "./factory.js";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { AWSKMSProvider } from "./providers/aws-kms.js";
export { LocalProvider } from "./providers/local.js";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  AesDecryptOptions,
  AesEncryptResult,
  AWSKMSProviderConfig,
  DecryptOptions,
  EncryptedSecret,
  EncryptOptions,
  LocalProviderConfig,
  SecretMetadata,
  VaultConfig,
  VaultProvider,
  VaultProviderType,
} from "./types.js";
export {
  EncryptedSecretSchema,
  SecretMetadataSchema,
} from "./types.js";
