/**
 * Zero-config default `SnapshotStore`. The storage MECHANICS (composite-key
 * map, never returning rows across tenants) are NOT re-implemented here —
 * they are composed from `@nebutra/tenant-store`'s `InMemoryTenantStore`,
 * which already enforces tenant isolation structurally via its
 * `tenantId:id` key plus a defense-in-depth tenantId equality check.
 *
 * A production deployment swaps this for a Prisma/Redis adapter that
 * implements the same `SnapshotStore` interface; the README documents that
 * shape. The isolation property a Prisma adapter would get from RLS is here
 * provided by the borrowed composite key.
 */

import { InMemoryTenantStore, type TenantOwned } from "@nebutra/tenant-store";
import type { SnapshotStore } from "../types";

interface SnapshotRow extends TenantOwned {
  readonly tenantId: string;
  readonly state: Uint8Array;
}

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly inner = new InMemoryTenantStore<SnapshotRow>();

  async load(tenantId: string, roomId: string): Promise<Uint8Array | null> {
    const row = await this.inner.read(tenantId, roomId);
    return row ? row.state : null;
  }

  async save(tenantId: string, roomId: string, state: Uint8Array): Promise<void> {
    // Copy so a later in-place mutation of the caller's buffer can't
    // retroactively corrupt persisted state.
    await this.inner.write(tenantId, roomId, {
      tenantId,
      state: Uint8Array.from(state),
    });
  }

  /** Test helper. */
  clear(): void {
    this.inner.clear();
  }
}
