// =============================================================================
// MemoryProvider — in-process audit log buffer
// =============================================================================
// For local development, unit tests, and last-resort fallback when no
// production backend is configured. NEVER use in production: events are lost
// on process exit and there is no retention enforcement.
// =============================================================================

import type { AuditEvent, AuditQueryFilter } from "../schema";
import type { AuditProvider } from "./types";

export class MemoryAuditProvider implements AuditProvider {
  readonly type = "memory" as const;
  private readonly events: AuditEvent[] = [];

  async log(event: AuditEvent): Promise<void> {
    // Append-only: never replace, never reorder.
    this.events.push(event);
  }

  async query(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;

    const matches = this.events.filter((e) => {
      if (filter.tenantId && e.tenantId !== filter.tenantId) return false;
      if (filter.actorId && e.actor.id !== filter.actorId) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (filter.resourceType && e.resource.type !== filter.resourceType) return false;
      if (filter.resourceId && e.resource.id !== filter.resourceId) return false;
      if (filter.outcome && e.outcome !== filter.outcome) return false;
      if (filter.startDate && new Date(e.timestamp) < filter.startDate) return false;
      if (filter.endDate && new Date(e.timestamp) > filter.endDate) return false;
      return true;
    });

    // Sort by timestamp descending (most recent first).
    const sorted = [...matches].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });

    return sorted.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    // No-op for the memory provider. Buffer is GC'd with the instance.
  }

  /** @internal — exposed for tests so they can assert append-only behavior. */
  __all(): readonly AuditEvent[] {
    return this.events;
  }
}
