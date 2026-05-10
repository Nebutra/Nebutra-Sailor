import { CAPTCHA_PROVIDERS, getCaptchaProvider } from "./captcha-meta.js";
import { appendEnvBlock, removePackageDir, setEnvVar } from "./env-helpers.js";

/**
 * Captcha selection applier for create-sailor (L2 depth).
 *
 * - `none` removes `packages/captcha` entirely.
 * - Any other id appends provider env vars to `.env.example` (idempotent)
 *   and writes `CAPTCHA_PROVIDER="<id>"`.
 */
export async function applyCaptchaSelection(
  targetDir: string,
  providerId: string,
  _region: string = "global",
): Promise<void> {
  const provider = getCaptchaProvider(providerId);
  if (!provider) {
    throw new Error(
      `Unknown captcha provider "${providerId}". Valid ids: ${CAPTCHA_PROVIDERS.map(
        (p) => p.id,
      ).join(", ")}`,
    );
  }

  if (provider.id === "none") {
    removePackageDir(targetDir, "captcha");
    return;
  }

  if (provider.envVars.length > 0) {
    appendEnvBlock(targetDir, {
      category: "Captcha",
      name: provider.name,
      envVars: provider.envVars,
      docs: provider.docs,
    });
  }
  setEnvVar(targetDir, "CAPTCHA_PROVIDER", provider.id);
}
