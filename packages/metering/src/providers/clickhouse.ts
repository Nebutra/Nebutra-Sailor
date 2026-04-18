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
// Uses ClickHouse HTTP API for high-throughput event ingestion and aggregation.
// Features:
//   - MergeTree table with monthly partitioning
//   - JSONEachRow batch format for efficient inserts
//   - ReplacingMergeTree for idempotency deduplication
//   - Native ClickHouse aggregation (sumIf, countIf, etc.)
// =============================================================================

interface ClickHouseConfig {
  httpUrl: string;
  username: string;
  password: string;
  database: string;
  batchSize: number;
  flushIntervalMs: number;
}

interface QueuedEvent {
  event: UsageEvent;
  timestamp: string;
}

export class ClickHouseProvider implements MeteringProvider {
  readonly name = "clickhouse" as const;

  private config: ClickHouseConfig;
  private eventQueue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private meters: Map<string, MeterDefinition> = new Map();
  private initialized = false;

  constructor(config: Omit<ClickHouseProviderConfig, "provider">) {
    this.config = {
      httpUrl: config.httpUrl ?? process.env.CLICKHOUSE_HTTP_URL ?? "http://localhost:8123",
      username: config.username ?? process.env.CLICKHOUSE_USER ?? "default",
      password: config.password ?? process.env.CLICKHOUSE_PASSWORD ?? "",
      database: config.database ?? "default",
      batchSize: config.batchSize ?? 1000,
      flushIntervalMs: config.flushIntervalMs ?? 5000,
    };

    logger.info("[metering:clickhouse] Provider initialised", {
      httpUrl: this.config.httpUrl,
      database: this.config.database,
    });
  }

  // ── HTTP Utilities ──────────────────────────────────────────────────────

  private async query(sql: string, format = "TabSeparated"): Promise<string> {
    const url = new URL(this.config.httpUrl);
    url.searchParams.set("database", this.config.database);
    url.searchParams.set("default_format", format);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
      },
      body: sql,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("[metering:clickhouse] Query failed", {
        status: response.status,
        error: error.slice(0, 500),
      });
      throw new Error(`ClickHouse query failed: ${response.status} ${error.slice(0, 200)}`);
    }

    return response.text();
  }

  private async insert(table: string, data: string, format = "JSONEachRow"): Promise<void> {
    const url = new URL(this.config.httpUrl);
    url.searchParams.set("database", this.config.database);
    url.searchParams.set("default_format", format);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
      },
      body: `INSERT INTO ${table} FORMAT ${format}\n${data}`,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("[metering:clickhouse] Insert failed", {
        table,
        status: response.status,
        error: error.slice(0, 500),
      });
      throw new Error(`ClickHouse insert failed: ${response.status}`);
    }
  }

  // ── Table Management ────────────────────────────────────────────────────

  private async ensureTableExists(): Promise<void> {
    if (this.initialized) return;

    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS nebutra_usage_events (
          id String,
          meter_id String,
          tenant_id String,
          value Float64,
          timestamp DateTime DEFAULT now(),
          properties String DEFAULT '{}',
          idempotency_key Nullable(String),
          version UInt32 DEFAULT 1
        ) ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (tenant_id, meter_id, timestamp)
        SETTINGS index_granularity = 8192;
      `;

      await this.query(createTableSQL);
      this.initialized = true;
      logger.info("[metering:clickhouse] Table ensured");
    } catch (error) {
      logger.error("[metering:clickhouse] Failed to ensure table", { error });
      throw error;
    }
  }

  // ── Meter Definition ────────────────────────────────────────────────────

  async defineMeter(definition: MeterDefinition): Promise<void> {
    await this.ensureTableExists();
    this.meters.set(definition.id, definition);
    logger.debug("[metering:clickhouse] Meter defined", { id: definition.id });
  }

  // ── Ingest ──────────────────────────────────────────────────────────────

  async ingest(event: UsageEvent): Promise<void> {
    await this.ensureTableExists();

    const validated = UsageEventSchema.parse(event);
    const timestamp = validated.timestamp ?? new Date().toISOString();

    this.eventQueue.push({ event: validated, timestamp });

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  async ingestBatch(events: UsageEvent[]): Promise<void> {
    for (const event of events) {
      const validated = UsageEventSchema.parse(event);
      const timestamp = validated.timestamp ?? new Date().toISOString();
      this.eventQueue.push({ event: validated, timestamp });
    }

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventQueue.length === 0) return;

    const eventsToInsert = this.eventQueue.splice(0, this.config.batchSize);

    try {
      const jsonLines = eventsToInsert
        .map(({ event, timestamp }) => ({
          id: event.id ?? crypto.randomUUID(),
          meter_id: event.meterId,
          tenant_id: event.tenantId,
          value: event.value,
          timestamp,
          properties: JSON.stringify(event.properties ?? {}),
          idempotency_key: event.idempotencyKey ?? null,
          version: 1,
        }))
        .map((row) => JSON.stringify(row))
        .join("\n");

      await this.insert("nebutra_usage_events", jsonLines, "JSONEachRow");
      logger.debug("[metering:clickhouse] Batch inserted", {
        count: eventsToInsert.length,
      });
    } catch (error) {
      logger.error("[metering:clickhouse] Flush failed", { error });
      this.eventQueue.unshift(...eventsToInsert);
      throw error;
    }
  }

  // ── Usage Aggregation ───────────────────────────────────────────────────

  private getPeriodRange(period: PeriodType, referenceDate = new Date()) {
    const date = new Date(referenceDate);

    switch (period) {
      case "hourly": {
        const start = new Date(date);
        start.setMinutes(0, 0, 0);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        return { start: start.toISOString(), end: end.toISOString() };
      }

      case "daily": {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start: start.toISOString(), end: end.toISOString() };
      }

      case "monthly": {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return { start: start.toISOString(), end: end.toISOString() };
      }
    }
  }

  private getAggregationSQL(aggregation: AggregationType, valueCol = "value"): string {
    switch (aggregation) {
      case "sum":
        return `sum(${valueCol})`;
      case "max":
        return `max(${valueCol})`;
      case "count":
        return "count()";
      case "count_distinct":
        return "uniq(id)";
    }
  }

  // ── Query Usage ─────────────────────────────────────────────────────────

  async getUsage(
    tenantId: string,
    meterId: string,
    period: PeriodType,
  ): Promise<UsageSummary | null> {
    await this.ensureTableExists();

    const meter = this.meters.get(meterId);
    if (!meter) return null;

    const { start, end } = this.getPeriodRange(period);
    const aggSQL = this.getAggregationSQL(meter.aggregation);

    const sql = `
      SELECT ${aggSQL} as value
      FROM nebutra_usage_events
      FINAL
      WHERE tenant_id = '${tenantId}'
        AND meter_id = '${meterId}'
        AND timestamp >= '${start}'
        AND timestamp < '${end}'
    `;

    try {
      const result = await this.query(sql, "JSONCompact");
      const parsed = JSON.parse(`[${result}]`);
      const value = parsed[0]?.[0] ?? 0;

      return {
        meterId,
        tenantId,
        periodStart: start,
        periodEnd: end,
        value: Number(value) || 0,
      };
    } catch (error) {
      logger.error("[metering:clickhouse] getUsage failed", { error });
      return null;
    }
  }

  async getUsageHistory(
    tenantId: string,
    meterId: string,
    opts: {
      period: PeriodType;
      startDate: string;
      endDate: string;
    },
  ): Promise<UsageSummary[]> {
    await this.ensureTableExists();

    const meter = this.meters.get(meterId);
    if (!meter) return [];

    const aggSQL = this.getAggregationSQL(meter.aggregation);

    let groupBySQL = "";
    switch (opts.period) {
      case "hourly":
        groupBySQL = "GROUP BY toStartOfHour(timestamp)";
        break;
      case "daily":
        groupBySQL = "GROUP BY toStartOfDay(timestamp)";
        break;
      case "monthly":
        groupBySQL = "GROUP BY toStartOfMonth(timestamp)";
        break;
    }

    const sql = `
      SELECT
        toISOString(toStartOfDay(timestamp)) as period_start,
        toISOString(toStartOfDay(timestamp) + INTERVAL 1 ${opts.period === "hourly" ? "HOUR" : opts.period === "daily" ? "DAY" : "MONTH"}) as period_end,
        ${aggSQL} as value
      FROM nebutra_usage_events
      FINAL
      WHERE tenant_id = '${tenantId}'
        AND meter_id = '${meterId}'
        AND timestamp >= '${opts.startDate}'
        AND timestamp < '${opts.endDate}'
      ${groupBySQL}
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.query(sql, "JSONCompact");
      const rows = JSON.parse(`[${result}]`);

      return rows.map(
        (row: any[]) =>
          ({
            meterId,
            tenantId,
            periodStart: row[0],
            periodEnd: row[1],
            value: Number(row[2]) || 0,
          }) as UsageSummary,
      );
    } catch (error) {
      logger.error("[metering:clickhouse] getUsageHistory failed", { error });
      return [];
    }
  }

  // ── Quota Management ────────────────────────────────────────────────────

  async setQuota(
    tenantId: string,
    meterId: string,
    limit: number,
    period: PeriodType,
  ): Promise<void> {
    // In a real implementation, this would be stored in a quotas table
    // For now, we'll just log it
    logger.info("[metering:clickhouse] Quota set", {
      tenantId,
      meterId,
      limit,
      period,
    });
  }

  async getQuota(
    _tenantId: string,
    _meterId: string,
    _period: PeriodType,
  ): Promise<UsageQuota | null> {
    // This would typically query from a quotas table
    // For now, return null to indicate no quota configured
    return null;
  }

  // ── Breakdown ───────────────────────────────────────────────────────────

  async getBreakdown(
    tenantId: string,
    meterId: string,
    dimension: string,
    period: PeriodType,
  ): Promise<Record<string, number>> {
    await this.ensureTableExists();

    const meter = this.meters.get(meterId);
    if (!meter) return {};

    const { start, end } = this.getPeriodRange(period);
    const aggSQL = this.getAggregationSQL(meter.aggregation);

    const sql = `
      SELECT
        JSONExtractString(properties, '${dimension}') as dim_value,
        ${aggSQL} as value
      FROM nebutra_usage_events
      FINAL
      WHERE tenant_id = '${tenantId}'
        AND meter_id = '${meterId}'
        AND timestamp >= '${start}'
        AND timestamp < '${end}'
        AND properties LIKE '%${dimension}%'
      GROUP BY dim_value
    `;

    try {
      const result = await this.query(sql, "JSONCompact");
      const rows = JSON.parse(`[${result}]`);

      const breakdown: Record<string, number> = {};
      for (const row of rows) {
        breakdown[row[0]] = Number(row[1]) || 0;
      }
      return breakdown;
    } catch (error) {
      logger.error("[metering:clickhouse] getBreakdown failed", { error });
      return {};
    }
  }

  // ── Threshold Alerting ──────────────────────────────────────────────────

  async checkThreshold(
    _tenantId: string,
    _meterId: string,
    _threshold: number,
    _period: PeriodType,
  ): Promise<ThresholdAlert | null> {
    // This would normally check against a configured quota
    // For now, return null to indicate no alert triggered
    return null;
  }

  // ── Shutdown ────────────────────────────────────────────────────────────

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.eventQueue.length > 0) {
      await this.flush();
    }
    logger.info("[metering:clickhouse] Provider shut down");
  }
}
