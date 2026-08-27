import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { logger } from "@nebutra/logger";

const DEFAULT_DATABASE = "nebutra";
const DEDUPE_TTL_MS = 60 * 60 * 1000;

export interface EventContext {
  tenantId: string;
  userId?: string | null | undefined;
  sessionId?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  experimentId?: string | null | undefined;
  requestId?: string | null | undefined;
  traceId?: string | null | undefined;
  occurredAt: string | Date;
  contractVersion?: string | undefined;
}

export interface EventEnvelope {
  eventName: string;
  context: EventContext;
  payload?: Record<string, unknown> | undefined;
  eventId?: string | undefined;
  source?: string | undefined;
}

export interface IngestResult {
  accepted: number;
  duplicated: number;
}

let client: ClickHouseClient | null = null;
let bootstrapped = false;
const idempotencyCache = new Map<string, number>();

function getDatabase(): string {
  const raw = process.env.CLICKHOUSE_DATABASE?.trim();
  return raw && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : DEFAULT_DATABASE;
}

function getClient(): ClickHouseClient {
  if (client) return client;

  const url =
    process.env.CLICKHOUSE_URL ?? process.env.CLICKHOUSE_HTTP_URL ?? "http://localhost:8123";

  client = createClient({
    url,
    username: process.env.CLICKHOUSE_USERNAME ?? process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: getDatabase(),
  });

  return client;
}

async function bootstrap(db: string): Promise<void> {
  if (bootstrapped) return;
  const c = getClient();
  await c.command({ query: `CREATE DATABASE IF NOT EXISTS ${db}` });
  await c.command({
    query: `
      CREATE TABLE IF NOT EXISTS ${db}.events_bronze (
        event_id String,
        event_name LowCardinality(String),
        tenant_id String,
        user_id Nullable(String),
        session_id Nullable(String),
        utm_source Nullable(String),
        utm_medium Nullable(String),
        utm_campaign Nullable(String),
        experiment_id Nullable(String),
        request_id Nullable(String),
        trace_id Nullable(String),
        source LowCardinality(String),
        contract_version LowCardinality(String),
        event_time DateTime64(3, 'UTC'),
        received_at DateTime64(3, 'UTC'),
        event_properties String
      )
      ENGINE = ReplacingMergeTree(received_at)
      PARTITION BY toYYYYMM(event_time)
      ORDER BY (tenant_id, event_time, event_id)
    `,
  });
  bootstrapped = true;
}

function eventIdFor(event: EventEnvelope): string {
  if (event.eventId) return event.eventId;
  const occurred =
    event.context.occurredAt instanceof Date
      ? event.context.occurredAt.toISOString()
      : event.context.occurredAt;
  const payloadKey = JSON.stringify(event.payload ?? {}, Object.keys(event.payload ?? {}).sort());
  const raw = `${event.eventName}:${event.context.tenantId}:${occurred}:${payloadKey}`;
  // Web Crypto SHA-256 — node 20+ has globalThis.crypto.subtle
  return hashSha256Hex(raw);
}

function hashSha256Hex(input: string): string {
  // Synchronous fallback for environments without async crypto.subtle in this code path:
  // Node's built-in `node:crypto` ships with the runtime; importing dynamically avoids
  // ESM evaluation cost in the hot path.
  // biome-ignore lint/style/noNonNullAssertion: require resolved at runtime
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(input).digest("hex");
}

function pruneCache(nowMs: number): void {
  const threshold = nowMs - DEDUPE_TTL_MS;
  for (const [key, ts] of idempotencyCache) {
    if (ts < threshold) idempotencyCache.delete(key);
  }
}

export async function ingestEvents(
  events: readonly EventEnvelope[],
  options: { organizationId?: string | undefined } = {},
): Promise<IngestResult> {
  if (options.organizationId) {
    const mismatch = events.find((e) => e.context.tenantId !== options.organizationId);
    if (mismatch) {
      throw new Error(
        `x-organization-id does not match event tenantId (${mismatch.context.tenantId})`,
      );
    }
  }

  const db = getDatabase();
  await bootstrap(db);

  const nowMs = Date.now();
  pruneCache(nowMs);

  const nowIso = new Date(nowMs).toISOString();
  let duplicated = 0;
  const rows: Record<string, unknown>[] = [];

  for (const event of events) {
    const id = eventIdFor(event);
    if (idempotencyCache.has(id)) {
      duplicated++;
      continue;
    }
    idempotencyCache.set(id, nowMs);

    const occurred =
      event.context.occurredAt instanceof Date
        ? event.context.occurredAt.toISOString()
        : event.context.occurredAt;

    rows.push({
      event_id: id,
      event_name: event.eventName,
      tenant_id: event.context.tenantId,
      user_id: event.context.userId ?? null,
      session_id: event.context.sessionId ?? null,
      utm_source: event.context.utmSource ?? null,
      utm_medium: event.context.utmMedium ?? null,
      utm_campaign: event.context.utmCampaign ?? null,
      experiment_id: event.context.experimentId ?? null,
      request_id: event.context.requestId ?? null,
      trace_id: event.context.traceId ?? null,
      source: event.source ?? "web",
      contract_version: event.context.contractVersion ?? "v1",
      event_time: occurred,
      received_at: nowIso,
      event_properties: JSON.stringify(event.payload ?? {}),
    });
  }

  if (rows.length > 0) {
    try {
      await getClient().insert({
        table: `${db}.events_bronze`,
        values: rows,
        format: "JSONEachRow",
      });
    } catch (error) {
      logger.error("event-ingest: ClickHouse insert failed", error as Error, {
        batchSize: rows.length,
      });
      throw error;
    }
  }

  return { accepted: rows.length, duplicated };
}
