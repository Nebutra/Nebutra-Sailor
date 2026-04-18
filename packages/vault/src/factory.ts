import { logger } from "@nebutra/logger";
import type { VaultConfig, VaultProvider, VaultProviderType } from "./types";

// =============================================================================
// Vault Factory — Provider-agnostic secrets vault creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createVault()`
//   2. `VAULT_PROVIDER` environment variable
//   3. Auto-detection based on available env vars
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: VaultProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 *
 * Priority:
 * 1. AWS_KMS_KEY_ID or AWS_KMS_KEY_ARN → aws-kms
 * 2. VAULT_MASTER_KEY → local
 * 3. Fail (no valid config found)
 */
function detectProvider(): VaultProviderType {
  if (process.env.AWS_KMS_KEY_ID || process.env.AWS_KMS_KEY_ARN) {
    return "aws-kms";
  }
  if (process.env.VAULT_MASTER_KEY) {
    return "local";
  }

  throw new Error(
    "No vault provider detected. Set AWS_KMS_KEY_ID/AWS_KMS_KEY_ARN (for AWS KMS) " +
      "or VAULT_MASTER_KEY (for local). Or pass explicit config to createVault().",
  );
}

/**
 * Create a vault provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const vault = await createVault();
 *
 * // Explicit AWS KMS
 * const vault = await createVault({
 *   provider: "aws-kms",
 *   keyId: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
 *   region: "us-east-1",
 * });
 *
 * // Explicit local
 * const vault = await createVault({
 *   provider: "local",
 *   masterKey: "my-super-secret-master-key",
 * });
 * ```
 */
export async function createVault(config?: VaultConfig): Promise<VaultProvider> {
  const providerType =
    config?.provider ??
    (process.env.VAULT_PROVIDER as VaultProviderType | undefined) ??
    detectProvider();

  logger.info("[vault] Creating provider", { provider: providerType });

  switch (providerType) {
    case "aws-kms": {
      const { AWSKMSProvider } = await import("./providers/aws-kms");
      const kmsConfig = config as Exclude<VaultConfig, { provider: "local" }> | undefined;
      return new AWSKMSProvider({
        provider: "aws-kms",
        ...(kmsConfig?.keyId !== undefined ? { keyId: kmsConfig.keyId } : {}),
        ...(kmsConfig?.region !== undefined ? { region: kmsConfig.region } : {}),
        ...(kmsConfig?.credentials !== undefined ? { credentials: kmsConfig.credentials } : {}),
        ...(kmsConfig?.keyVersion !== undefined ? { keyVersion: kmsConfig.keyVersion } : {}),
      });
    }

    case "local": {
      const { LocalProvider } = await import("./providers/local");
      const localConfig = config as Exclude<VaultConfig, { provider: "aws-kms" }> | undefined;
      return new LocalProvider({
        provider: "local",
        ...(localConfig?.masterKey !== undefined ? { masterKey: localConfig.masterKey } : {}),
        ...(localConfig?.salt !== undefined ? { salt: localConfig.salt } : {}),
        ...(localConfig?.keyVersion !== undefined ? { keyVersion: localConfig.keyVersion } : {}),
      });
    }

    default:
      throw new Error(`Unknown vault provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) vault provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getVault(): Promise<VaultProvider> {
  if (!defaultProvider) {
    defaultProvider = await createVault();
  }
  return defaultProvider;
}

/**
 * Replace the default vault provider (useful in tests).
 */
export function setVault(provider: VaultProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default vault provider.
 */
export async function closeVault(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}
