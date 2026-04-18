import { appendEnvBlock, removePackageDir, setEnvVar } from "./env-helpers.js";
import { getWebhooksProvider, WEBHOOKS_PROVIDERS } from "./webhooks-meta.js";

/**
 * Webhooks selection applier for create-sailor (L2 depth).
 *
 * - `none` removes the `packages/webhooks` workspace entirely.
 * - Any other id appends provider env vars to `.env.example` (idempotent) and
 *   writes `WEBHOOKS_PROVIDER="<id>"`.
 *
 * Silent-skip: missing `packages/webhooks` or `.env.example` → no-op.
 */
export async function applyWebhooksSelection(
  targetDir: string,
  providerId: string,
  _region: string = "global",
): Promise<void> {
  const provider = getWebhooksProvider(providerId);
  if (!provider) {
    throw new Error(
      `Unknown webhooks provider "${providerId}". Valid ids: ${WEBHOOKS_PROVIDERS.map(
        (p) => p.id,
      ).join(", ")}`,
    );
  }

  if (provider.id === "none") {
    removePackageDir(targetDir, "webhooks");
    return;
  }

  if (provider.envVars.length > 0) {
    appendEnvBlock(targetDir, {
      category: "Webhooks",
      name: provider.name,
      envVars: provider.envVars,
      docs: provider.docs,
    });
  }
  setEnvVar(targetDir, "WEBHOOKS_PROVIDER", provider.id);
}
