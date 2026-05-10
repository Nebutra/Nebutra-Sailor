// =============================================================================
// AuditProvider interface
// =============================================================================
// Provider-agnostic abstraction matching the @nebutra/queue and @nebutra/search
// patterns: customers swap backends via env vars without changing app code.
// =============================================================================

import type { AuditEvent, AuditQueryFilter } from "../schema";

export type AuditProviderType = "memory" | "postgres" | "clickhouse";

export interface AuditProvider {
  readonly type: AuditProviderType;
  /** Append an event to the immutable audit log. MUST NOT throw on transient
   *  failures — log + swallow to keep the caller's path resilient. */
  log(event: AuditEvent): Promise<void>;
  /** Query past events. Tenant-scoped queries are STRONGLY RECOMMENDED — the
   *  caller is responsible for passing `tenantId` to honor multi-tenancy. */
  query(filter: AuditQueryFilter): Promise<AuditEvent[]>;
  /** Release any held connections / flush in-flight buffers. */
  close(): Promise<void>;
}
