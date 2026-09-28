/**
 * Workers never use the preview database: there is no process to spawn and no
 * loopback to reach. Resolved through the `#preview-db` import condition so
 * the Worker bundles carry this stub instead of the Node detection.
 */
import type { PreviewDatabase } from "./preview-mode";

export type { PreviewDatabase } from "./preview-mode";
export const PREVIEW_DB_DEFAULT_PORT = 54329;
export const PREVIEW_DB_ROLE = "app_user";

export function previewDatabase(_env: Record<string, string | undefined>): PreviewDatabase | null {
  return null;
}

export function awaitPreviewDatabase(_pool: unknown, _preview: PreviewDatabase): void {}
