# ClickHouse Warehouse (Batch C)

Warehouse-first analytics stack for Nebutra superstarter.

## Components

- `init/001_bootstrap.sql`: bootstraps `nebutra.events_bronze`
- `dbt/`: bronze/silver/gold models

## Local run

1. Start services:

```bash
docker compose up -d clickhouse event-ingest-service
```

2. Ingest sample events:

```bash
curl -X POST http://localhost:8008/api/v1/events/ingest \
  -H 'Content-Type: application/json' \
  -H 'x-organization-id: org_demo' \
  -d '{
    "events": [
      {
        "eventName": "user.signed_up",
        "eventId": "evt_signup_1",
        "source": "web",
        "context": {
          "tenantId": "org_demo",
          "userId": "user_1",
          "occurredAt": "2026-03-01T12:00:00Z",
          "contractVersion": "v1"
        },
        "payload": {"plan": "PRO"}
      }
    ]
  }'
```

3. Run dbt (requires `dbt-clickhouse` locally):

```bash
cd infra/data/clickhouse/dbt
cp profiles.example.yml ~/.dbt/profiles.yml
dbt run
```

## Gold model

`nebutra.growth_metrics_daily` (gold model) is consumed by web dashboard summary API.
