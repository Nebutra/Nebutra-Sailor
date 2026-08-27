-- =============================================================================
-- @nebutra/metering — ClickHouse schema
-- =============================================================================
-- Apply with:
--   clickhouse-client --database=nebutra_metering --multiquery < 001_init.sql
-- or via HTTP:
--   curl -X POST "$CLICKHOUSE_URL/?database=nebutra_metering" \
--     --data-binary @001_init.sql
-- =============================================================================

-- ── Raw event ingestion table ───────────────────────────────────────────────
-- Append-only fact table; uses ReplacingMergeTree on `id` for idempotent retries.
CREATE TABLE IF NOT EXISTS usage_events (
  event_id        UUID DEFAULT generateUUIDv4(),
  id              String,                                 -- client-supplied id (idempotency)
  tenant_id       String,
  meter_id        String,
  ts              DateTime64(3) DEFAULT now64(),
  quantity        Float64,
  properties      String DEFAULT '{}',                    -- JSON-encoded dimensions
  idempotency_key Nullable(String),
  ingested_at     DateTime DEFAULT now(),
  version         UInt32 DEFAULT 1
) ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, meter_id, ts, id)
SETTINGS index_granularity = 8192;

-- ── Daily pre-aggregate for fast quota reads ────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_aggregates_daily (
  tenant_id   String,
  meter_id    String,
  day         Date,
  total_sum   AggregateFunction(sum, Float64),
  total_max   AggregateFunction(max, Float64),
  total_count AggregateFunction(count, UInt64),
  total_uniq  AggregateFunction(uniq, String)
) ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, meter_id, day);

-- Materialized view that keeps the aggregate fresh as events arrive.
CREATE MATERIALIZED VIEW IF NOT EXISTS usage_aggregates_daily_mv
TO usage_aggregates_daily AS
SELECT
  tenant_id,
  meter_id,
  toDate(ts) AS day,
  sumState(quantity)        AS total_sum,
  maxState(quantity)        AS total_max,
  countState()              AS total_count,
  uniqState(id)             AS total_uniq
FROM usage_events
GROUP BY tenant_id, meter_id, day;

-- ── Quota table ─────────────────────────────────────────────────────────────
-- Stores per-tenant per-meter limits. ReplacingMergeTree on `version` lets us
-- update by re-inserting a row with a higher version.
CREATE TABLE IF NOT EXISTS usage_quotas (
  tenant_id   String,
  meter_id    String,
  period      LowCardinality(String),     -- 'hourly' | 'daily' | 'monthly'
  limit_value Float64,
  updated_at  DateTime DEFAULT now(),
  version     UInt64 DEFAULT toUnixTimestamp64Milli(now64(3))
) ENGINE = ReplacingMergeTree(version)
ORDER BY (tenant_id, meter_id, period);
