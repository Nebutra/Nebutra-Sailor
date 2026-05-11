/**
 * In-memory export store for the account-export route.
 *
 * Co-located here (underscored = private, not a route segment) so that
 * `route.ts` only exports the symbols Next.js 16 permits on Route files
 * (HTTP verbs + Route Segment Config). Test helpers and shared state must
 * live outside `route.ts`.
 *
 * Replace `exportStore` with durable storage (object store + signed URLs)
 * when the export pipeline gets wired to a background job queue.
 */

export interface ExportRecord {
  exportId: string;
  userId: string;
  status: "pending" | "ready" | "failed";
  estimatedReadyAt: string;
  createdAt: string;
  data?: unknown;
  downloadUrl?: string;
  sizeBytes: number;
}

export const exportStore = new Map<string, ExportRecord>();

/** @internal — exposed for tests so they can clear in-memory state. */
export function __resetExportStoreForTests() {
  exportStore.clear();
}
