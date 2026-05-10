# Event Ingest Service

Contract-first ingestion service that validates incoming event envelopes and writes raw records to ClickHouse bronze.

## Endpoints

- `POST /api/v1/events/ingest` - ingest up to 1000 events per request
- `GET /health` - service and ClickHouse health

## Required headers

- `x-organization-id` (optional but recommended for service-to-service calls)

## Example payload

```json
{
  "events": [
    {
      "eventName": "user.signed_up",
      "eventId": "evt_123",
      "source": "web",
      "context": {
        "tenantId": "org_123",
        "userId": "user_123",
        "occurredAt": "2026-03-01T12:00:00Z",
        "contractVersion": "v1"
      },
      "payload": {
        "plan": "PRO"
      }
    }
  ]
}
```
