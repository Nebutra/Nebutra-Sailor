import { z } from "zod";

// =============================================================================
// Core Metering Abstraction — Provider-agnostic usage metering types
// =============================================================================

/**
 * Supported metering backend providers.
 *
 * - `clickhouse` — ClickHouse (production analytics DB, already in stack)
 * - `memory`     — In-memory metering for local dev & testing (NOT for production)
 */
export type MeteringProviderType = "clickhouse" | "memory";

// ── Meter Type ──────────────────────────────────────────────────────────────

/**
 * Meter types supported by the metering system.
 *
 * - `counter`       — Cumulative count (e.g., API calls, total tokens)
 * - `gauge`         — Point-in-time measurement (e.g., current storage usage)
 * - `histogram`     — Distribution of values (e.g., request latencies)
 * - `unique_count`  — Count of unique identifiers (e.g., active users)
 */
export type MeterType = "counter" | "gauge" | "histogram" | "unique_count";

/**
 * Aggregation functions for meters.
 *
 * - `sum`           — Total across period (counters)
 * - `max`           — Maximum value in period (gauges)
 * - `count`         — Count of events
 * - `count_distinct`— Count of unique identifiers
 */
export type AggregationType = "sum" | "max" | "count" | "count_distinct";

/**
 * Billing period granularity.
 */
export type PeriodType = "hourly" | "daily" | "monthly";

// ── Meter Definition ────────────────────────────────────────────────────────

export const MeterDefinitionSchema = z.object({
  /** Unique identifier for the meter (e.g., "api_calls", "ai_tokens") */
  id: z.string().min(1),

  /** Display name for the meter */
  name: z.string(),

  /** Type of meter */
  type: z.enum(["counter", "gauge", "histogram", "unique_count"]),

  /** Human-readable description */
  description: z.string().optional(),

  /** Unit of measurement (e.g., "requests", "tokens", "bytes", "users") */
  unit: z.string(),

  /** How to aggregate values across the period */
  aggregation: z.enum(["sum", "max", "count", "count_distinct"]),
});

export type MeterDefinition = z.infer<typeof MeterDefinitionSchema>;

// ── Usage Event ─────────────────────────────────────────────────────────────

export const UsageEventSchema = z.object({
  /** Unique event ID (auto-generated if omitted) */
  id: z.string().optional(),

  /** Meter ID this event is for */
  meterId: z.string(),

  /** Tenant ID for multi-tenancy */
  tenantId: z.string(),

  /** Numeric value being recorded */
  value: z.number().min(0),

  /** ISO-8601 timestamp (defaults to now) */
  timestamp: z.string().datetime().optional(),

  /** Arbitrary dimensions for breakdown analysis (e.g., { endpoint: "/v1/chat", model: "gpt-4" }) */
  properties: z.record(z.string(), z.unknown()).optional(),

  /** Idempotency key for deduplication */
  idempotencyKey: z.string().optional(),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

// ── Usage Summary ───────────────────────────────────────────────────────────

export interface UsageSummary {
  /** Meter being reported on */
  meterId: string;

  /** Tenant being reported on */
  tenantId: string;

  /** Start of the billing period (ISO-8601) */
  periodStart: string;

  /** End of the billing period (ISO-8601) */
  periodEnd: string;

  /** Aggregated value for the period */
  value: number;

  /** Optional breakdown by dimension */
  breakdown?: Record<string, number> | undefined;
}

// ── Usage Quota ─────────────────────────────────────────────────────────────

export interface UsageQuota {
  /** Meter being tracked */
  meterId: string;

  /** Tenant being tracked */
  tenantId: string;

  /** Quota limit for the period */
  limit: number;

  /** Current usage */
  used: number;

  /** Remaining quota */
  remaining: number;

  /** Percentage used (0-100) */
  percentage: number;

  /** Billing period type */
  period: PeriodType;

  /** Period start date (ISO-8601) */
  periodStart: string;

  /** Period end date (ISO-8601) */
  periodEnd: string;
}

// ── Threshold Alert ─────────────────────────────────────────────────────────

export interface ThresholdAlert {
  /** Meter that triggered the alert */
  meterId: string;

  /** Tenant that triggered the alert */
  tenantId: string;

  /** Threshold that was crossed (0.8, 0.9, 1.0) */
  threshold: number;

  /** Current usage value */
  currentUsage: number;

  /** Quota limit */
  limit: number;

  /** ISO-8601 timestamp of the alert */
  triggeredAt: string;
}

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every metering backend must implement this interface.
 * The factory function (`createMetering`) returns a `MeteringProvider`.
 */
export interface MeteringProvider {
  readonly name: MeteringProviderType;

  /**
   * Register a meter definition.
   */
  defineMeter(definition: MeterDefinition): Promise<void>;

  /**
   * Ingest a single usage event.
   */
  ingest(event: UsageEvent): Promise<void>;

  /**
   * Ingest multiple events in a single batch (optimized for high-throughput).
   */
  ingestBatch(events: UsageEvent[]): Promise<void>;

  /**
   * Get usage for the current billing period.
   */
  getUsage(tenantId: string, meterId: string, period: PeriodType): Promise<UsageSummary | null>;

  /**
   * Get historical usage across multiple periods.
   */
  getUsageHistory(
    tenantId: string,
    meterId: string,
    opts: {
      period: PeriodType;
      startDate: string; // ISO-8601
      endDate: string; // ISO-8601
    },
  ): Promise<UsageSummary[]>;

  /**
   * Get current quota status.
   */
  getQuota(tenantId: string, meterId: string, period: PeriodType): Promise<UsageQuota | null>;

  /**
   * Set or update a quota limit for a meter.
   */
  setQuota(tenantId: string, meterId: string, limit: number, period: PeriodType): Promise<void>;

  /**
   * Get usage breakdown by a specific dimension.
   */
  getBreakdown(
    tenantId: string,
    meterId: string,
    dimension: string,
    period: PeriodType,
  ): Promise<Record<string, number>>;

  /**
   * Check if usage exceeds a threshold and return alert if so.
   */
  checkThreshold(
    tenantId: string,
    meterId: string,
    threshold: number,
    period: PeriodType,
  ): Promise<ThresholdAlert | null>;

  /**
   * Graceful shutdown — drain any pending operations, close connections.
   */
  close(): Promise<void>;
}

// ── Factory Config ──────────────────────────────────────────────────────────

export interface ClickHouseProviderConfig {
  provider: "clickhouse";

  /** ClickHouse HTTP API URL (defaults to `process.env.CLICKHOUSE_HTTP_URL`) */
  httpUrl?: string;

  /** ClickHouse username (defaults to `process.env.CLICKHOUSE_USER`) */
  username?: string;

  /** ClickHouse password (defaults to `process.env.CLICKHOUSE_PASSWORD`) */
  password?: string;

  /** Database name to use (default: "default") */
  database?: string;

  /** Batch size for inserts (default: 1000) */
  batchSize?: number;

  /** Batch flush interval in milliseconds (default: 5000) */
  flushIntervalMs?: number;
}

export interface MemoryProviderConfig {
  provider: "memory";
}

export type MeteringConfig = ClickHouseProviderConfig | MemoryProviderConfig;
