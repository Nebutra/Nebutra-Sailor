"""Event ingest service.

Validates event contracts and persists raw events into ClickHouse bronze.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from clickhouse_connect import get_client
from clickhouse_connect.driver.client import Client
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from _shared.errors import generic_exception_handler
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("event-ingest")


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000

    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "nebutra"

    dedupe_ttl_seconds: int = 3600


settings = Settings()


class EventContext(BaseModel):
    tenantId: str = Field(min_length=1)
    userId: str | None = None
    sessionId: str | None = None
    utmSource: str | None = None
    utmMedium: str | None = None
    utmCampaign: str | None = None
    experimentId: str | None = None
    requestId: str | None = None
    traceId: str | None = None
    occurredAt: datetime
    contractVersion: str = "v1"


class EventEnvelope(BaseModel):
    eventName: str = Field(min_length=1)
    context: EventContext
    payload: dict[str, Any] = Field(default_factory=dict)
    eventId: str | None = None
    source: str = "web"


class IngestRequest(BaseModel):
    events: list[EventEnvelope] = Field(min_length=1, max_length=1000)


class IngestResponse(BaseModel):
    accepted: int
    duplicated: int


_clickhouse_client: Client | None = None
_idempotency_cache: dict[str, datetime] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        client = get_clickhouse_client()
        client.command("SELECT 1")
        logger.info("Event ingest service started and connected to ClickHouse")
    except Exception as exc:  # pragma: no cover - startup log only
        logger.warning("ClickHouse unavailable at startup: %s", exc)
    yield


app = FastAPI(
    title="Nebutra Event Ingest Service",
    description="Contract-first event ingestion for warehouse bronze layer",
    version="0.1.0",
    lifespan=lifespan,
)

instrument_app(app, service_name="event-ingest-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.
# This service is internal and should not be exposed directly to browsers.


def _event_id(event: EventEnvelope) -> str:
    if event.eventId:
        return event.eventId

    raw = f"{event.eventName}:{event.context.tenantId}:{event.context.occurredAt.isoformat()}:{json.dumps(event.payload, sort_keys=True)}"  # noqa: E501
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _cleanup_cache(now: datetime) -> None:
    threshold = now - timedelta(seconds=settings.dedupe_ttl_seconds)
    stale = [key for key, ts in _idempotency_cache.items() if ts < threshold]
    for key in stale:
        _idempotency_cache.pop(key, None)


def _create_tables(client: Client) -> None:
    client.command(f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}")
    client.command(
        f"""
        CREATE TABLE IF NOT EXISTS {settings.clickhouse_database}.events_bronze
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
        ORDER BY (tenant_id, event_time, event_id)
        """
    )


def get_clickhouse_client() -> Client:
    global _clickhouse_client

    if _clickhouse_client is None:
        _clickhouse_client = get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_database,
        )
        _create_tables(_clickhouse_client)

    return _clickhouse_client


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "event-ingest",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    try:
        client = get_clickhouse_client()
        client.command("SELECT 1")
        return {"status": "ok", "clickhouse": "connected"}
    except Exception as exc:
        return {
            "status": "degraded",
            "clickhouse": "disconnected",
            "error": str(exc),
        }


@app.post("/api/v1/events/ingest", response_model=IngestResponse)
async def ingest_events(
    request: IngestRequest,
    x_organization_id: str | None = Header(default=None),
) -> IngestResponse:
    # Optional S2S guard: if header exists, all events must match header tenant
    if x_organization_id and any(
        event.context.tenantId != x_organization_id for event in request.events
    ):
        raise HTTPException(
            status_code=400,
            detail="x-organization-id does not match event tenantId",
        )

    now = datetime.now(UTC)
    _cleanup_cache(now)

    rows: list[list[Any]] = []
    duplicated = 0

    for event in request.events:
        event_id = _event_id(event)

        if event_id in _idempotency_cache:
            duplicated += 1
            continue

        _idempotency_cache[event_id] = now

        rows.append(
            [
                event_id,
                event.eventName,
                event.context.tenantId,
                event.context.userId,
                event.context.sessionId,
                event.context.utmSource,
                event.context.utmMedium,
                event.context.utmCampaign,
                event.context.experimentId,
                event.context.requestId,
                event.context.traceId,
                event.source,
                event.context.contractVersion,
                event.context.occurredAt,
                now,
                json.dumps(event.payload, ensure_ascii=True),
            ]
        )

    if rows:
        client = get_clickhouse_client()
        client.insert(
            f"{settings.clickhouse_database}.events_bronze",
            rows,
            column_names=[
                "event_id",
                "event_name",
                "tenant_id",
                "user_id",
                "session_id",
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "experiment_id",
                "request_id",
                "trace_id",
                "source",
                "contract_version",
                "event_time",
                "received_at",
                "event_properties",
            ],
        )

    return IngestResponse(accepted=len(rows), duplicated=duplicated)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
