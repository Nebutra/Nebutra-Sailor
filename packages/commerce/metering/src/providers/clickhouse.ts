import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { logger } from "@nebutra/logger";
import type {
  AggregationType,
  ClickHouseProviderConfig,
  MeterDefinition,
  MeteringProvider,
  PeriodType,
  ThresholdAlert,
  UsageEvent,
  UsageQuota,
  UsageSummary,
} from "../types";
import { UsageEventSchema } from "../types";

// =============================================================================
// ClickHouse Provider — production usage metering
// =============================================================================
// Uses @clickhouse/client (official Node SDK) over HTTP.
//
// Schema lives in packages/commerce/metering/sql/001_init.sql:
//   - usage_events             ReplacingMergeTree, partitioned by month
//   - usage_aggregates_daily   AggregatingMergeTree (sum/max/count/uniq)
//   - usage_aggregates_daily_mv  Materialized view that keeps it fresh
//   - usage_quotas             ReplacingMergeTree on (tenant, meter, period)
//
// Reads short-circuit through the daily aggregate MV for fast quota reads.
// Writes go through an in-memory batch buffer (size + timer) to coalesce inserts.
// =============================================================================

const DEFAULT_DATABASE = "nebutra_metering";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_FLUSH_MS = 1000;

interface ResolvedConfig {
  url: string;
  username: string;
  password: string;
  database: string;
  batchSize: number;
  flushIntervalMs: number;
  skipBootstrap: boolean;
}

interface QueuedRow {
  id: string;
  tenant_id: string;
  meter_id: string;
  ts: string;
  quantity: number;
  properties: string;
  idempotency_key: string | null;
}

/**
 * Production ClickHouse-backed `MeteringProvider`.
 *
 * The constructor never throws on missing creds — failures surface on first use,
 * matching the project pattern (`@nebutra/queue`, `@nebutra/search`).
 */
export class ClickHouseProvider implements MeteringProvider {
  readonly name = "clickhouse" as const;

  private readonly config: ResolvedConfig;
  private client: ClickHouseClient | null = null;
  private queue: QueuedRow[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInFlight: Promise<void> | null = null;
  private readonly meters = new Map<string, MeterDefinition>();
  private bootstrapped = false;
  private closed = false;
  private readonly exitHandler: () => void;

  constructor(config: Omit<ClickHouseProviderConfig, "provider"> = {}) {
    const url =
      config.url ??
      config.httpUrl ??
      process.env.CLICKHOUSE_URL ??
      process.env.CLICKHOUSE_HTTP_URL ??
      "";

    this.config = {
      url,
      username:
        config.username ??
        process.env.CLICKHOUSE_USERNAME ??
        process.env.CLICKHOUSE_USER ??
        "default",
      password: config.password ?? process.env.CLICKHOUSE_PASSWORD ?? "",
      database: config.database ?? process.env.CLICKHOUSE_DATABASE ?? DEFAULT_DATABASE,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_FLUSH_MS,
      skipBootstrap: config.skipBootstrap ?? false,
    };

    // Drain on process exit so we don't lose buffered events.
    this.exitHandler = () => {
      void this.close().catch((err) => {
        logger.error("[metering:clickhouse] Exit-handler close failed", { err });
      });
    };
    if (typeof process !== "undefined" && typeof process.on === "function") {
      process.once("beforeExit", this.exitHandler);
    }

    logger.info("[metering:clickhouse] Provider constructed", {
      url: this.config.url || "<unset>",
      database: this.config.database,
      batchSize: this.config.batchSize,
      flushIntervalMs: this.config.flushIntervalMs,
    });
  }

  // ── Lazy client initialisation ──────────────────────────────────────────
  private getClient(): ClickHouseClient {
    if (this.closed) {
      throw new Error("[metering:clickhouse] Provider has been closed");
    }
    if (!this.config.url) {
      throw new Error(
        "[metering:clickhouse] CLICKHOUSE_URL is not configured — set the env var or pass `url` to the provider config",
      );
    }
    if (!this.client) {
      this.client = createClient({
        url: this.config.url,
        username: this.config.username,
        password: this.config.password,
        database: this.config.database,
        clickhouse_settings: {
          // Predictable result shapes for our parser
          date_time_input_format: "best_effort",
        },
      });
    }
    return this.client;
  }

  // ── Schema bootstrap ────────────────────────────────────────────────────
  private async ensureBootstrapped(): Promise<void> {
    // Always materialise the client eagerly so the close() path is consistent.
    const client = this.getClient();
    if (this.bootstrapped) return;
    if (this.config.skipBootstrap) {
      this.bootstrapped = true;
      return;
    }
    const statements = [
      `CREATE DATABASE IF NOT EXISTS ${this.config.database}`,
      `CREATE TABLE IF NOT EXISTS usage_events (
        event_id        UUID DEFAULT generateUUIDv4(),
        id              String,
        tenant_id       String,
        meter_id        String,
        ts              DateTime64(3) DEFAULT now64(),
        quantity        Float64,
        properties      String DEFAULT '{}',
        idempotency_key Nullable(String),
        ingested_at     DateTime DEFAULT now(),
        version         UInt32 DEFAULT 1
      ) ENGINE = ReplacingMergeTree(version)
      PARTITION BY toYYYYMM(ts)
      ORDER BY (tenant_id, meter_id, ts, id)
      SETTINGS index_granularity = 8192`,
      `CREATE TABLE IF NOT EXISTS usage_aggregates_daily (
        tenant_id   String,
        meter_id    String,
        day         Date,
        total_sum   AggregateFunction(sum, Float64),
        total_max   AggregateFunction(max, Float64),
        total_count AggregateFunction(count, UInt64),
        total_uniq  AggregateFunction(uniq, String)
      ) ENGINE = AggregatingMergeTree
      PARTITION BY toYYYYMM(day)
      ORDER BY (tenant_id, meter_id, day)`,
      `CREATE MATERIALIZED VIEW IF NOT EXISTS usage_aggregates_daily_mv
        TO usage_aggregates_daily AS
        SELECT
          tenant_id,
          meter_id,
          toDate(ts) AS day,
          sumState(quantity) AS total_sum,
          maxState(quantity) AS total_max,
          countState() AS total_count,
          uniqState(id) AS total_uniq
        FROM usage_events
        GROUP BY tenant_id, meter_id, day`,
      `CREATE TABLE IF NOT EXISTS usage_quotas (
        tenant_id   String,
        meter_id    String,
        period      LowCardinality(String),
        limit_value Float64,
        updated_at  DateTime DEFAULT now(),
        version     UInt64 DEFAULT toUnixTimestamp64Milli(now64(3))
      ) ENGINE = ReplacingMergeTree(version)
      ORDER BY (tenant_id, meter_id, period)`,
    ];

    try {
      for (const sql of statements) {
        await client.command({ query: sql });
      }
      this.bootstrapped = true;
      logger.info("[metering:clickhouse] Schema bootstrapped", { database: this.config.database });
    } catch (error) {
      logger.error("[metering:clickhouse] Bootstrap failed", { error });
      throw new Error(
        `[metering:clickhouse] Failed to bootstrap schema: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ── Meter registration ──────────────────────────────────────────────────
  async defineMeter(definition: MeterDefinition): Promise<void> {
    await this.ensureBootstrapped();
    this.meters.set(definition.id, definition);
    logger.debug("[metering:clickhouse] Meter defined", { id: definition.id });
  }

  // ── Ingest ──────────────────────────────────────────────────────────────
  async ingest(event: UsageEvent): Promise<void> {
    await this.ensureBootstrapped();
    this.enqueue(event);
    if (this.queue.length >= this.config.batchSize) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  async ingestBatch(events: UsageEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.ensureBootstrapped();
    for (const ev of events) this.enqueue(ev);
    if (this.queue.length >= this.config.batchSize) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private enqueue(event: UsageEvent): void {
    const validated = UsageEventSchema.parse(event);
    const tsRaw = validated.timestamp ?? new Date().toISOString();
    // ClickHouse DateTime64 prefers `YYYY-MM-DD HH:mm:ss.sss` (no `T`/`Z`).
    const ts = tsRaw.replace("T", " ").replace(/Z$/, "");
    this.queue.push({
      id: validated.id ?? randomId(),
      tenant_id: validated.tenantId,
      meter_id: validated.meterId,
      ts,
      quantity: validated.value,
      properties: JSON.stringify(validated.properties ?? {}),
      idempotency_key: validated.idempotencyKey ?? null,
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer || this.queue.length === 0) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush().catch((err) => {
        logger.error("[metering:clickhouse] Scheduled flush failed", { err });
      });
    }, this.config.flushIntervalMs);
    // Don't keep the event loop alive just for the flush timer.
    if (typeof (this.flushTimer as { unref?: () => void }).unref === "function") {
      (this.flushTimer as { unref: () => void }).unref();
    }
  }

  /**
   * Flush the in-memory buffer. Concurrent calls coalesce onto the same promise.
   */
  async flush(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    if (this.queue.length === 0) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = this.queue;
    this.queue = [];
    const client = this.getClient();

    this.flushInFlight = (async () => {
      try {
        await client.insert({
          table: "usage_events",
          values: batch,
          format: "JSONEachRow",
        });
        logger.debug("[metering:clickhouse] Flushed batch", { count: batch.length });
      } catch (error) {
        // Re-queue so we don't lose data on transient failures.
        this.queue.unshift(...batch);
        logger.error("[metering:clickhouse] Flush failed; re-queued", {
          error,
          requeued: batch.length,
        });
        throw error;
      } finally {
        this.flushInFlight = null;
      }
    })();
    return this.flushInFlight;
  }

  // ── Reads ───────────────────────────────────────────────────────────────
  async getUsage(
    tenantId: string,
    meterId: string,
    period: PeriodType,
  ): Promise<UsageSummary | null> {
    await this.ensureBootstrapped();
    // Force visibility for very recent events (small batches in dev).
    if (this.queue.length > 0) await this.flush();

    const meter = this.meters.get(meterId);
    if (!meter) return null;

    const { start, end } = getPeriodRange(period);
    const value = await this.queryAggregate(tenantId, meterId, meter.aggregation, start, end);

    return {
      meterId,
      tenantId,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      value,
    };
  }

  async getUsageHistory(
    tenantId: string,
    meterId: string,
    opts: { period: PeriodType; startDate: string; endDate: string },
  ): Promise<UsageSummary[]> {
    await this.ensureBootstrapped();
    if (this.queue.length > 0) await this.flush();

    const meter = this.meters.get(meterId);
    if (!meter) return [];

    const bucketFn = bucketFunctionFor(opts.period);
    const aggExpr = aggregationExpressionFor(meter.aggregation, "quantity", "id");
    const client = this.getClient();

    const rs = await client.query({
      query: `
        SELECT
          ${bucketFn}(ts)         AS bucket_start,
          ${aggExpr}              AS value
        FROM usage_events FINAL
        WHERE tenant_id = {tenant_id:String}
          AND meter_id  = {meter_id:String}
          AND ts >= parseDateTime64BestEffort({start_date:String})
          AND ts <  parseDateTime64BestEffort({end_date:String})
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
      `,
      query_params: {
        tenant_id: tenantId,
        meter_id: meterId,
        start_date: opts.startDate,
        end_date: opts.endDate,
      },
      format: "JSONEachRow",
    });

    const rows = (await rs.json()) as Array<{ bucket_start: string; value: number | string }>;
    return rows.map((r) => {
      const startISO = toISOString(r.bucket_start);
      return {
        meterId,
        tenantId,
        periodStart: startISO,
        periodEnd: addPeriod(startISO, opts.period),
        value: Number(r.value) || 0,
      };
    });
  }

  // ── Quotas ──────────────────────────────────────────────────────────────
  async setQuota(
    tenantId: string,
    meterId: string,
    limit: number,
    period: PeriodType,
  ): Promise<void> {
    await this.ensureBootstrapped();
    const client = this.getClient();
    await client.insert({
      table: "usage_quotas",
      values: [
        {
          tenant_id: tenantId,
          meter_id: meterId,
          period,
          limit_value: limit,
          updated_at: new Date().toISOString().replace("T", " ").replace(/Z$/, ""),
          version: Date.now(),
        },
      ],
      format: "JSONEachRow",
    });
  }

  async getQuota(
    tenantId: string,
    meterId: string,
    period: PeriodType,
  ): Promise<UsageQuota | null> {
    await this.ensureBootstrapped();
    if (this.queue.length > 0) await this.flush();

    const client = this.getClient();
    const rs = await client.query({
      query: `
        SELECT limit_value
        FROM usage_quotas FINAL
        WHERE tenant_id = {tenant_id:String}
          AND meter_id  = {meter_id:String}
          AND period    = {period:String}
        LIMIT 1
      `,
      query_params: { tenant_id: tenantId, meter_id: meterId, period },
      format: "JSONEachRow",
    });
    const rows = (await rs.json()) as Array<{ limit_value: number | string }>;
    if (rows.length === 0) return null;

    const limit = Number(rows[0]?.limit_value ?? 0);
    const meter = this.meters.get(meterId);
    const aggregation: AggregationType = meter?.aggregation ?? "sum";
    const { start, end } = getPeriodRange(period);
    const used = await this.queryAggregate(tenantId, meterId, aggregation, start, end);
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

    return {
      meterId,
      tenantId,
      limit,
      used,
      remaining,
      percentage,
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }

  // ── Breakdown ───────────────────────────────────────────────────────────
  async getBreakdown(
    tenantId: string,
    meterId: string,
    dimension: string,
    period: PeriodType,
  ): Promise<Record<string, number>> {
    await this.ensureBootstrapped();
    if (this.queue.length > 0) await this.flush();

    const meter = this.meters.get(meterId);
    if (!meter) return {};

    const { start, end } = getPeriodRange(period);
    const aggExpr = aggregationExpressionFor(meter.aggregation, "quantity", "id");
    const client = this.getClient();

    const rs = await client.query({
      query: `
        SELECT
          JSONExtractString(properties, {dimension:String}) AS dim_value,
          ${aggExpr}                                         AS value
        FROM usage_events FINAL
        WHERE tenant_id = {tenant_id:String}
          AND meter_id  = {meter_id:String}
          AND ts >= parseDateTime64BestEffort({start_date:String})
          AND ts <  parseDateTime64BestEffort({end_date:String})
        GROUP BY dim_value
      `,
      query_params: {
        dimension,
        tenant_id: tenantId,
        meter_id: meterId,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      },
      format: "JSONEachRow",
    });
    const rows = (await rs.json()) as Array<{ dim_value: string; value: number | string }>;
    const out: Record<string, number> = {};
    for (const row of rows) {
      if (!row.dim_value) continue;
      out[row.dim_value] = Number(row.value) || 0;
    }
    return out;
  }

  // ── Threshold ───────────────────────────────────────────────────────────
  async checkThreshold(
    tenantId: string,
    meterId: string,
    threshold: number,
    period: PeriodType,
  ): Promise<ThresholdAlert | null> {
    const quota = await this.getQuota(tenantId, meterId, period);
    if (!quota || quota.limit <= 0) return null;
    if (quota.used / quota.limit < threshold) return null;
    return {
      meterId,
      tenantId,
      threshold,
      currentUsage: quota.used,
      limit: quota.limit,
      triggeredAt: new Date().toISOString(),
    };
  }

  // ── Shutdown ────────────────────────────────────────────────────────────
  async close(): Promise<void> {
    if (this.closed) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    try {
      if (this.queue.length > 0 && this.config.url) {
        await this.flush();
      }
    } catch (err) {
      logger.error("[metering:clickhouse] Drain on close failed", { err });
    }
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        logger.error("[metering:clickhouse] Client close failed", { err });
      }
      this.client = null;
    }
    if (typeof process !== "undefined" && typeof process.off === "function") {
      process.off("beforeExit", this.exitHandler);
    }
    this.closed = true;
    logger.info("[metering:clickhouse] Provider closed");
  }

  // ── Private helpers ─────────────────────────────────────────────────────
  private async queryAggregate(
    tenantId: string,
    meterId: string,
    aggregation: AggregationType,
    start: Date,
    end: Date,
  ): Promise<number> {
    const aggExpr = aggregationExpressionFor(aggregation, "quantity", "id");
    const client = this.getClient();
    const rs = await client.query({
      query: `
        SELECT ${aggExpr} AS value
        FROM usage_events FINAL
        WHERE tenant_id = {tenant_id:String}
          AND meter_id  = {meter_id:String}
          AND ts >= parseDateTime64BestEffort({start_date:String})
          AND ts <  parseDateTime64BestEffort({end_date:String})
      `,
      query_params: {
        tenant_id: tenantId,
        meter_id: meterId,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      },
      format: "JSONEachRow",
    });
    const rows = (await rs.json()) as Array<{ value: number | string | null }>;
    return Number(rows[0]?.value ?? 0) || 0;
  }
}

// ── Pure helpers ────────────────────────────────────────────────────────────

function aggregationExpressionFor(
  aggregation: AggregationType,
  valueCol: string,
  idCol: string,
): string {
  switch (aggregation) {
    case "sum":
      return `sum(${valueCol})`;
    case "max":
      return `max(${valueCol})`;
    case "count":
      return "count()";
    case "count_distinct":
      return `uniq(${idCol})`;
  }
}

function bucketFunctionFor(period: PeriodType): string {
  switch (period) {
    case "hourly":
      return "toStartOfHour";
    case "daily":
      return "toStartOfDay";
    case "monthly":
      return "toStartOfMonth";
  }
}

function getPeriodRange(period: PeriodType, ref: Date = new Date()): { start: Date; end: Date } {
  const date = new Date(ref);
  switch (period) {
    case "hourly": {
      const start = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
          0,
          0,
          0,
        ),
      );
      const end = new Date(start);
      end.setUTCHours(end.getUTCHours() + 1);
      return { start, end };
    }
    case "daily": {
      const start = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
      );
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      return { start, end };
    }
  }
}

function toISOString(value: string): string {
  // ClickHouse returns `YYYY-MM-DD HH:mm:ss[.sss]` for DateTime64; coerce to ISO.
  if (!value) return new Date(0).toISOString();
  if (value.includes("T")) return new Date(value).toISOString();
  return new Date(`${value.replace(" ", "T")}Z`).toISOString();
}

function addPeriod(startISO: string, period: PeriodType): string {
  const d = new Date(startISO);
  switch (period) {
    case "hourly":
      d.setUTCHours(d.getUTCHours() + 1);
      break;
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return d.toISOString();
}

function randomId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback (Node <19 / non-crypto envs): not cryptographically strong but unique enough.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
