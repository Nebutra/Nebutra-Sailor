import fs from "node:fs";
import path from "node:path";
import { CMS_PROVIDERS, getCmsProvider } from "./cms-meta.js";
import { appendEnvBlock, removePackageDir, setEnvVar } from "./env-helpers.js";

/**
 * CMS selection applier for create-sailor (L2 depth).
 *
 * - `none` removes `packages/sanity` AND `apps/studio` (Sanity Studio app).
 * - `sanity` keeps both packages/sanity + apps/studio.
 * - Other ids remove Sanity-specific packages and append env vars for the
 *   chosen provider.
 */
export async function applyCmsSelection(
  targetDir: string,
  providerId: string,
  _region: string = "global",
): Promise<void> {
  const provider = getCmsProvider(providerId);
  if (!provider) {
    throw new Error(
      `Unknown CMS provider "${providerId}". Valid ids: ${CMS_PROVIDERS.map((p) => p.id).join(
        ", ",
      )}`,
    );
  }

  const studioDir = path.join(targetDir, "apps", "studio");

  if (provider.id === "none") {
    removePackageDir(targetDir, "sanity");
    if (fs.existsSync(studioDir)) {
      fs.rmSync(studioDir, { recursive: true, force: true });
    }
    return;
  }

  if (provider.id !== "sanity") {
    removePackageDir(targetDir, "sanity");
    if (fs.existsSync(studioDir)) {
      fs.rmSync(studioDir, { recursive: true, force: true });
    }
  }

  if (provider.envVars.length > 0) {
    appendEnvBlock(targetDir, {
      category: "CMS",
      name: provider.name,
      envVars: provider.envVars,
      docs: provider.docs,
    });
  }
  setEnvVar(targetDir, "CMS_PROVIDER", provider.id);
}
