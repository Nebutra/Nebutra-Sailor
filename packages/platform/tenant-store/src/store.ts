/**
 * Tenant-scoped persistence primitives.
 *
 * Two artifacts that were independently re-implemented per feature
 * (atelier-canvas scenes, reel graphs, knowledge-rag chunks) and are now
 * shared:
 *
 *  - `TenantScopedStore<T>` — the minimal honest read contract every
 *    tenant-scoped store exposes. It deliberately does NOT prescribe
 *    `create` / `save`, because domain write signatures legitimately differ
 *    (a scene vs. nodes+edges vs. a chunk batch). Over-unifying those would be
 *    a leaky abstraction; the shared part is *reads* + isolation.
 *
 *  - `InMemoryTenantStore<T>` — the storage MECHANICS (a Map keyed by
 *    `tenantId:id`, never returning rows across tenants, tenant-filtered
 *    listing). Concrete in-memory stores compose this and add their own
 *    typed `create` / `save` on top, instead of copying the Map+key+filter
 *    boilerplate.
 *
 * The same tenant-isolation property a Prisma adapter gets from RLS is
 * enforced here structurally by the composite key.
 */

/** Records carry their owning tenant so listing can be verified, not trusted. */
export interface TenantOwned {
  readonly tenantId: string;
}

/** Minimal read contract shared by every tenant-scoped store. */
export interface TenantScopedStore<TRecord extends TenantOwned> {
  read(tenantId: string, id: string): Promise<TRecord | null>;
  listByTenant(tenantId: string): Promise<readonly TRecord[]>;
}

function key(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

/**
 * Reusable in-memory storage core. Default for tests and flag-gated demos;
 * production features wrap a Prisma/RLS adapter behind the same read contract.
 */
export class InMemoryTenantStore<TRecord extends TenantOwned>
  implements TenantScopedStore<TRecord>
{
  private readonly rows = new Map<string, TRecord>();

  async read(tenantId: string, id: string): Promise<TRecord | null> {
    const row = this.rows.get(key(tenantId, id));
    // Defense in depth: the composite key already isolates, but verify the
    // stored record's own tenantId too so a mis-keyed write can't leak.
    return row && row.tenantId === tenantId ? row : null;
  }

  async write(tenantId: string, id: string, record: TRecord): Promise<TRecord> {
    if (record.tenantId !== tenantId) {
      throw new Error(
        `tenant-store: record.tenantId "${record.tenantId}" does not match write tenant "${tenantId}". ` +
          `Fix: pass a record whose tenantId equals the tenant you are writing for.`,
      );
    }
    this.rows.set(key(tenantId, id), record);
    return record;
  }

  async listByTenant(tenantId: string): Promise<readonly TRecord[]> {
    return [...this.rows.values()].filter((r) => r.tenantId === tenantId);
  }

  /** Test helper. */
  clear(): void {
    this.rows.clear();
  }
}
