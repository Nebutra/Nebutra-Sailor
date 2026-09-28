/** Workers never start the preview database; see preview-server.ts. */
import type { PreviewDatabase } from "./preview-mode";

export async function ensurePreviewDatabase(_preview: PreviewDatabase): Promise<void> {
  throw new Error("[db] the preview database is not available in Workers; set DATABASE_URL");
}
