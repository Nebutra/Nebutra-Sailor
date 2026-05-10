CREATE DATABASE IF NOT EXISTS nebutra;

CREATE TABLE IF NOT EXISTS nebutra.events_bronze
(
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
ORDER BY (tenant_id, event_time, event_id);
