"""Standardized health check endpoints for all Python microservices.

Liveness  (/health) — is the process alive?
Readiness (/ready)  — can the service handle traffic? (checks dependencies)

Each service should override `_readiness_checks` to add service-specific
dependency checks.  The shared checks (database, redis) are opt-in via
environment variables so services that don't need them don't pay the cost.
"""

from __future__ import annotations

import os
import time
import asyncio
import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


# ── Individual dependency checks ─────────────────────────────────────────────


async def _check_postgres(dsn: str, timeout: float = 3.0) -> dict[str, Any]:
    """Check PostgreSQL connectivity with a lightweight SELECT 1."""
    start = time.perf_counter()
    try:
        import asyncpg  # type: ignore[import]

        conn = await asyncio.wait_for(asyncpg.connect(dsn), timeout=timeout)
        try:
            await conn.fetchval("SELECT 1")
        finally:
            await conn.close()
        return {"status": "up", "latency_ms": round((time.perf_counter() - start) * 1000, 1)}
    except asyncio.TimeoutError:
        return {"status": "down", "error": "timeout", "latency_ms": round((time.perf_counter() - start) * 1000, 1)}
    except Exception as exc:
        return {"status": "down", "error": str(exc)[:120], "latency_ms": round((time.perf_counter() - start) * 1000, 1)}


async def _check_redis(url: str, timeout: float = 3.0) -> dict[str, Any]:
    """Check Redis/Valkey connectivity with PING."""
    start = time.perf_counter()
    try:
        import redis.asyncio as aioredis  # type: ignore[import]

        client = aioredis.from_url(url, socket_connect_timeout=timeout)
        try:
            await asyncio.wait_for(client.ping(), timeout=timeout)
        finally:
            await client.aclose()
        return {"status": "up", "latency_ms": round((time.perf_counter() - start) * 1000, 1)}
    except asyncio.TimeoutError:
        return {"status": "down", "error": "timeout", "latency_ms": round((time.perf_counter() - start) * 1000, 1)}
    except Exception as exc:
        return {"status": "down", "error": str(exc)[:120], "latency_ms": round((time.perf_counter() - start) * 1000, 1)}


# ── Aggregator ────────────────────────────────────────────────────────────────


async def _run_dependency_checks() -> tuple[dict[str, Any], bool]:
    """
    Run all configured dependency checks in parallel.

    Returns:
        (dependencies dict, all_healthy bool)

    Services opt-in to checks by setting env vars:
        DATABASE_URL  → enables PostgreSQL check
        REDIS_URL     → enables Redis check
    """
    tasks: dict[str, Any] = {}

    db_url = os.environ.get("DATABASE_URL")
    redis_url = os.environ.get("REDIS_URL")

    coros = {}
    if db_url:
        coros["database"] = _check_postgres(db_url)
    if redis_url:
        coros["redis"] = _check_redis(redis_url)

    if coros:
        results = await asyncio.gather(*coros.values(), return_exceptions=True)
        for name, result in zip(coros.keys(), results):
            if isinstance(result, Exception):
                tasks[name] = {"status": "down", "error": str(result)[:120]}
            else:
                tasks[name] = result

    all_healthy = all(v.get("status") == "up" for v in tasks.values())
    return tasks, all_healthy


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("/health")
async def liveness() -> JSONResponse:
    """
    Liveness probe — is the process alive?

    Returns 200 as long as the event loop is responsive.
    Kubernetes restarts the pod if this fails.
    """
    return JSONResponse({"status": "healthy"})


@router.get("/ready")
async def readiness() -> JSONResponse:
    """
    Readiness probe — can the service handle traffic?

    Runs dependency checks (database, redis) in parallel.
    Returns 200 only if all configured dependencies are reachable.
    Kubernetes removes the pod from the Service endpoint slice if this fails.
    """
    dependencies, all_healthy = await _run_dependency_checks()

    status_code = 200 if all_healthy else 503
    payload: dict[str, Any] = {
        "status": "ready" if all_healthy else "not_ready",
    }
    if dependencies:
        payload["dependencies"] = dependencies

    return JSONResponse(payload, status_code=status_code)


@router.get("/livez")
async def livez() -> JSONResponse:
    """Kubernetes /livez convention alias for liveness probe."""
    return JSONResponse({"status": "ok"})


@router.get("/readyz")
async def readyz() -> JSONResponse:
    """Kubernetes /readyz convention alias for readiness probe."""
    dependencies, all_healthy = await _run_dependency_checks()

    status_code = 200 if all_healthy else 503
    payload: dict[str, Any] = {
        "status": "ok" if all_healthy else "not_ready",
    }
    if dependencies:
        payload["dependencies"] = dependencies

    return JSONResponse(payload, status_code=status_code)
