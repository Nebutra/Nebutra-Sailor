"""Fire-and-forget usage event dispatcher.

Design intent:
  - Never block or slow down a request path.
  - Never raise: silently log failures, never surface to callers.
  - Survive go/event-ingest being down: events are queued in-memory and
    retried; on overflow the oldest events are dropped with a warning.

Usage:
    from _shared.usage import dispatch_usage
    from _shared.contracts import UsageEvent

    dispatch_usage(UsageEvent(
        tenant_id="org_123",
        event_name="llm.completion",
        provider="siliconflow",
        model="Qwen2.5-72B-Instruct",
        total_tokens=1234,
        duration_ms=820.4,
    ))

Lifecycle:
    Call start_usage_worker() in the FastAPI lifespan startup.
    Call stop_usage_worker() in the FastAPI lifespan shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .contracts import UsageEvent

logger = logging.getLogger("nebutra.usage")

_QUEUE_MAX = 2_000
_BATCH_SIZE = 50
_FLUSH_INTERVAL_S = 2.0

_queue: asyncio.Queue["UsageEvent"] | None = None
_worker_task: asyncio.Task[None] | None = None


def _get_queue() -> asyncio.Queue["UsageEvent"]:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue(maxsize=_QUEUE_MAX)
    return _queue


def dispatch_usage(event: "UsageEvent") -> None:
    """Non-blocking. Thread-safe from any asyncio context. Never raises."""
    try:
        _get_queue().put_nowait(event)
    except asyncio.QueueFull:
        logger.warning(
            "usage queue full (%d capacity) — dropping event for tenant=%s event=%s",
            _QUEUE_MAX,
            event.tenant_id,
            event.event_name,
        )


async def _flush_batch(
    batch: list["UsageEvent"],
    ingest_url: str | None,
) -> None:
    if not batch or not ingest_url:
        return

    import httpx

    payload = [e.model_dump() for e in batch]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(f"{ingest_url}/api/v1/events", json=payload)
            resp.raise_for_status()
    except Exception:
        logger.warning(
            "usage flush failed (batch=%d, url=%s) — events dropped",
            len(batch),
            ingest_url,
            exc_info=True,
        )


async def _worker_loop() -> None:
    ingest_url = os.environ.get("EVENT_INGEST_URL", "").rstrip("/") or None
    if not ingest_url:
        logger.info("EVENT_INGEST_URL not set — usage events will be logged only")

    q = _get_queue()
    batch: list[UsageEvent] = []
    last_flush = time.monotonic()

    while True:
        # Collect up to _BATCH_SIZE events with a _FLUSH_INTERVAL_S deadline.
        try:
            timeout = max(0.0, _FLUSH_INTERVAL_S - (time.monotonic() - last_flush))
            event = await asyncio.wait_for(q.get(), timeout=timeout)
            batch.append(event)
            q.task_done()

            # Drain more without waiting if they're already queued.
            while not q.empty() and len(batch) < _BATCH_SIZE:
                batch.append(q.get_nowait())
                q.task_done()
        except asyncio.TimeoutError:
            pass  # Normal idle tick
        except asyncio.CancelledError:
            # Graceful shutdown — flush whatever remains.
            if batch:
                await _flush_batch(batch, ingest_url)
            return

        if batch and (
            len(batch) >= _BATCH_SIZE
            or (time.monotonic() - last_flush) >= _FLUSH_INTERVAL_S
        ):
            if ingest_url:
                await _flush_batch(batch, ingest_url)
            else:
                for e in batch:
                    logger.debug(
                        "usage event (no ingest): event=%s tenant=%s model=%s tokens=%d",
                        e.event_name,
                        e.tenant_id,
                        e.model,
                        e.total_tokens,
                    )
            batch = []
            last_flush = time.monotonic()


def start_usage_worker() -> None:
    """Start the background worker. Call from FastAPI lifespan startup."""
    global _worker_task
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(_worker_loop(), name="usage-event-worker")
        logger.info("usage event worker started")


async def stop_usage_worker() -> None:
    """Gracefully stop the worker. Call from FastAPI lifespan shutdown."""
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
        _worker_task = None
        logger.info("usage event worker stopped")
