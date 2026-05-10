import { appendEnvBlock, removePackageDir, setEnvVar } from "./env-helpers.js";
import { getNotificationsProvider, NOTIFICATIONS_PROVIDERS } from "./notifications-meta.js";

/**
 * Notifications selection applier for create-sailor (L2 depth).
 *
 * - `none` removes the `packages/notifications` workspace entirely.
 * - `custom` keeps the package but does not inject provider env vars.
 * - Any other id appends provider env vars to `.env.example` (idempotent) and
 *   writes `NOTIFICATIONS_PROVIDER="<id>"`.
 *
 * Silent-skip: if `packages/notifications` or `.env.example` doesn't exist,
 * helpers no-op rather than throw.
 */
export async function applyNotificationsSelection(
  targetDir: string,
  providerId: string,
  _region: string = "global",
): Promise<void> {
  const provider = getNotificationsProvider(providerId);
  if (!provider) {
    throw new Error(
      `Unknown notifications provider "${providerId}". Valid ids: ${NOTIFICATIONS_PROVIDERS.map(
        (p) => p.id,
      ).join(", ")}`,
    );
  }

  if (provider.id === "none") {
    removePackageDir(targetDir, "notifications");
    return;
  }

  if (provider.envVars.length > 0) {
    appendEnvBlock(targetDir, {
      category: "Notifications",
      name: provider.name,
      envVars: provider.envVars,
      docs: provider.docs,
    });
  }
  setEnvVar(targetDir, "NOTIFICATIONS_PROVIDER", provider.id);
}
