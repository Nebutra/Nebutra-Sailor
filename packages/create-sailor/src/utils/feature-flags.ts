import { appendEnvBlock, removePackageDir, setEnvVar } from "./env-helpers.js";
import { FEATURE_FLAGS_PROVIDERS, getFeatureFlagsProvider } from "./feature-flags-meta.js";

/**
 * Feature Flags selection applier for create-sailor (L2 depth).
 *
 * - `none` removes `packages/feature-flags` entirely.
 * - Any other id appends provider env vars to `.env.example` (idempotent)
 *   and writes `FEATURE_FLAGS_PROVIDER="<id>"`.
 */
export async function applyFeatureFlagsSelection(
  targetDir: string,
  providerId: string,
  _region: string = "global",
): Promise<void> {
  const provider = getFeatureFlagsProvider(providerId);
  if (!provider) {
    throw new Error(
      `Unknown feature-flags provider "${providerId}". Valid ids: ${FEATURE_FLAGS_PROVIDERS.map(
        (p) => p.id,
      ).join(", ")}`,
    );
  }

  if (provider.id === "none") {
    removePackageDir(targetDir, "feature-flags");
    return;
  }

  if (provider.envVars.length > 0) {
    appendEnvBlock(targetDir, {
      category: "Feature Flags",
      name: provider.name,
      envVars: provider.envVars,
      docs: provider.docs,
    });
  }
  setEnvVar(targetDir, "FEATURE_FLAGS_PROVIDER", provider.id);
}
