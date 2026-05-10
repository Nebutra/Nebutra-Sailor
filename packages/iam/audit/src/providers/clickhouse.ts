// =============================================================================
// ClickHouseAuditProvider — high-volume analytics-grade audit storage
// =============================================================================
// Optional provider for customers running ClickHouse alongside @nebutra/metering.
// Activates when both `CLICKHOUSE_URL` is set and `AUDIT_USE_CLICKHOUSE=true`.
//
// The client is loaded lazily so installations that don't need ClickHouse can
// skip pulling `@clickhouse/client` into the runtime bundle.
// =============================================================================

import type { AuditEvent, AuditQueryFilter } from "../schema";
import type { AuditProvider } from "./types";

export interface ClickHouseAuditConfig {
  url: string;
  username?: string;
  password?: string;
  database?: string;
  table?: string;
}

interface ClickHouseClientLike {
  insert(args: { table: string; values: unknown[]; format: string }): Promise<unknown>;
  query(args: { query: string; format: string; query_params?: Record<string, unknown> }): Promise<{
    json: <T>() => Promise<{ data: T[] }>;
  }>;
  close(): Promise<void>;
}

export class ClickHouseAuditProvider implements AuditProvider {
  readonly type = "clickhouse" as const;
  private readonly table: string;
  constructor(
    private readonly client: ClickHouseClientLike,
    config: ClickHouseAuditConfig,
  ) {
    this.table = config.table ?? "audit_logs";
  }

  async log(event: AuditEvent): Promise<void> {
    await this.client.insert({
      table: this.table,
      format: "JSONEachRow",
      values: [
        {
          id: event.id,
          timestamp: event.timestamp,
          tenant_id: event.tenantId,
          actor_id: event.actor.id,
          actor_type: event.actor.type,
          actor_email: event.actor.email ?? null,
          action: event.action,
          resource_type: event.resource.type,
          resource_id: event.resource.id,
          resource_name: event.resource.name ?? null,
          outcome: event.outcome,
          severity: event.severity,
          ip: event.context?.ip ?? null,
          user_agent: event.context?.userAgent ?? null,
          request_id: event.context?.requestId ?? null,
          session_id: event.context?.sessionId ?? null,
          changes_before: event.changes?.before ?? null,
          changes_after: event.changes?.after ?? null,
          metadata: event.metadata ?? null,
        },
      ],
    });
  }

  async query(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    // ClickHouse query support is intentionally limited — it's optimized for
    // ingest, not point lookups. Most query workloads should hit Postgres.
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.tenantId) {
      where.push("tenant_id = {tenantId:String}");
      params.tenantId = filter.tenantId;
    }
    if (filter.actorId) {
      where.push("actor_id = {actorId:String}");
      params.actorId = filter.actorId;
    }
    if (filter.action) {
      where.push("action = {action:String}");
      params.action = filter.action;
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;

    const result = await this.client.query({
      query: `SELECT * FROM ${this.table} ${whereClause} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`,
      format: "JSONEachRow",
      query_params: params,
    });

    const { data } = await result.json<Record<string, unknown>>();
    return data.map(rowToEvent);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

function rowToEvent(row: Record<string, unknown>): AuditEvent {
  const get = <T>(key: string): T | undefined => row[key] as T | undefined;
  return {
    id: String(row.id),
    timestamp: String(row.timestamp),
    actor: {
      id: String(row.actor_id),
      type: (row.actor_type ?? "system") as AuditEvent["actor"]["type"],
      ...(row.actor_email ? { email: String(row.actor_email) } : {}),
    },
    tenantId: String(row.tenant_id),
    action: String(row.action),
    resource: {
      type: String(row.resource_type),
      id: String(row.resource_id),
      ...(row.resource_name ? { name: String(row.resource_name) } : {}),
    },
    outcome: (row.outcome ?? "success") as AuditEvent["outcome"],
    severity: (row.severity ?? "info") as AuditEvent["severity"],
    context: {
      ...(row.ip ? { ip: String(row.ip) } : {}),
      ...(row.user_agent ? { userAgent: String(row.user_agent) } : {}),
      ...(row.request_id ? { requestId: String(row.request_id) } : {}),
      ...(row.session_id ? { sessionId: String(row.session_id) } : {}),
    },
    ...(get("changes_before") && get("changes_after")
      ? {
          changes: {
            before: get("changes_before") as Record<string, unknown>,
            after: get("changes_after") as Record<string, unknown>,
          },
        }
      : {}),
    ...(get("metadata") ? { metadata: get("metadata") as Record<string, unknown> } : {}),
  };
}
