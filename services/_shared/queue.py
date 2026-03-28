"""
Provider-agnostic message queue for Nebutra Python microservices.

Supports:
  - Upstash QStash  (serverless, HTTP-based)
  - arq             (self-hosted Redis, asyncio-native)
  - In-memory       (dev/test only)

Auto-detects the provider from environment variables:
  QUEUE_PROVIDER=qstash  → QStash
  QUEUE_PROVIDER=arq     → arq (Redis)
  QSTASH_TOKEN set       → QStash
  REDIS_URL set          → arq
  Fallback               → memory

Usage:
    from _shared.queue import get_queue, create_job

    queue = await get_queue()
    await queue.enqueue(create_job("email", "send", {"to": "user@example.com"}))

    # Register a handler
    @queue.handler("email", "send")
    async def handle_send_email(job: JobPayload) -> None:
        await send_email(job["data"]["to"])
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Awaitable, Callable, TypeAlias

logger = logging.getLogger("nebutra.queue")

# ── Types ────────────────────────────────────────────────────────────────────

JobData: TypeAlias = dict[str, Any]
JobHandlerFn: TypeAlias = Callable[["JobPayload"], Awaitable[None]]


class QueueProviderType(str, Enum):
    QSTASH = "qstash"
    ARQ = "arq"
    MEMORY = "memory"


@dataclass(frozen=True)
class JobOptions:
    idempotency_key: str | None = None
    delay_sec: int = 0
    max_retries: int = 3
    tenant_id: str | None = None
    cron: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class JobPayload:
    id: str
    queue: str
    type: str
    data: JobData
    created_at: str
    options: JobOptions = field(default_factory=JobOptions)


@dataclass(frozen=True)
class JobResult:
    job_id: str
    accepted: bool
    provider: QueueProviderType


def create_job(
    queue: str,
    type_: str,
    data: JobData,
    *,
    options: JobOptions | None = None,
) -> JobPayload:
    """Build a JobPayload with auto-generated ID and timestamp."""
    return JobPayload(
        id=str(uuid.uuid4()),
        queue=queue,
        type=type_,
        data=data,
        created_at=datetime.now(timezone.utc).isoformat(),
        options=options or JobOptions(),
    )


# ── Abstract Provider ────────────────────────────────────────────────────────


class QueueProvider(ABC):
    """Every queue backend must implement this interface."""

    name: QueueProviderType
    _handlers: dict[str, JobHandlerFn]

    def __init__(self) -> None:
        self._handlers = {}

    @abstractmethod
    async def enqueue(self, job: JobPayload) -> JobResult: ...

    async def enqueue_batch(self, jobs: list[JobPayload]) -> list[JobResult]:
        """Default: sequential enqueue. Override for native batch support."""
        return [await self.enqueue(j) for j in jobs]

    def handler(
        self, queue: str, type_: str
    ) -> Callable[[JobHandlerFn], JobHandlerFn]:
        """Decorator to register a job handler."""

        def decorator(fn: JobHandlerFn) -> JobHandlerFn:
            key = f"{queue}:{type_}"
            self._handlers[key] = fn
            logger.info("Handler registered: %s", key)
            return fn

        return decorator

    def register_handler(
        self, queue: str, type_: str, fn: JobHandlerFn
    ) -> None:
        key = f"{queue}:{type_}"
        self._handlers[key] = fn
        logger.info("Handler registered: %s", key)

    def get_handler(self, queue: str, type_: str) -> JobHandlerFn | None:
        return self._handlers.get(f"{queue}:{type_}")

    @abstractmethod
    async def close(self) -> None: ...


# ── QStash Provider ──────────────────────────────────────────────────────────


class QStashQueueProvider(QueueProvider):
    """
    Upstash QStash — serverless HTTP-based message queue.

    Enqueue calls QStash publish API. Delivery is via HTTP POST to your API.
    """

    name = QueueProviderType.QSTASH

    def __init__(
        self,
        token: str | None = None,
        callback_base_url: str | None = None,
    ) -> None:
        super().__init__()
        self._token = token or os.environ["QSTASH_TOKEN"]
        self._base_url = (
            callback_base_url
            or os.environ.get("QSTASH_CALLBACK_BASE_URL")
            or os.environ.get("API_GATEWAY_URL", "http://localhost:3002")
        ).rstrip("/")
        self._api_url = "https://qstash.upstash.io/v2"
        # Lazy import — avoid hard dependency
        try:
            import httpx  # noqa: F401

            self._http: Any = None  # Initialized lazily
        except ImportError:
            raise ImportError(
                "httpx is required for QStash provider: pip install httpx"
            )
        logger.info("QStash provider initialised (callback=%s)", self._base_url)

    async def _get_http(self) -> Any:
        if self._http is None:
            import httpx

            self._http = httpx.AsyncClient(
                base_url=self._api_url,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._http

    async def enqueue(self, job: JobPayload) -> JobResult:
        http = await self._get_http()
        destination = f"{self._base_url}/api/queue/{job.queue}/{job.type}"

        headers: dict[str, str] = {
            "Upstash-Forward-x-nebutra-job-id": job.id,
            "Upstash-Forward-x-nebutra-queue": job.queue,
            "Upstash-Forward-x-nebutra-job-type": job.type,
        }

        if job.options.delay_sec > 0:
            headers["Upstash-Delay"] = f"{job.options.delay_sec}s"
        if job.options.max_retries != 3:
            headers["Upstash-Retries"] = str(job.options.max_retries)
        if job.options.idempotency_key:
            headers["Upstash-Deduplication-Id"] = job.options.idempotency_key
        if job.options.tenant_id:
            headers["Upstash-Forward-x-nebutra-tenant-id"] = job.options.tenant_id
        if job.options.cron:
            headers["Upstash-Cron"] = job.options.cron

        payload = {
            "id": job.id,
            "queue": job.queue,
            "type": job.type,
            "data": job.data,
            "options": {
                "tenantId": job.options.tenant_id,
                "maxRetries": job.options.max_retries,
            },
            "createdAt": job.created_at,
        }

        resp = await http.post(
            f"/publish/{destination}",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        body = resp.json()

        logger.info(
            "QStash job enqueued: %s → %s", job.id, body.get("messageId")
        )

        return JobResult(
            job_id=body.get("messageId", job.id),
            accepted=True,
            provider=QueueProviderType.QSTASH,
        )

    async def close(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None
        logger.info("QStash provider closed")


# ── arq Provider ─────────────────────────────────────────────────────────────


class ArqQueueProvider(QueueProvider):
    """
    arq — asyncio Redis job queue (self-hosted Redis backend).

    Uses arq's native enqueue; workers run via `arq worker` CLI.
    """

    name = QueueProviderType.ARQ

    def __init__(self, redis_url: str | None = None) -> None:
        super().__init__()
        self._redis_url = redis_url or os.environ.get(
            "REDIS_URL", "redis://localhost:6379"
        )
        self._pool: Any = None
        logger.info("arq provider initialised (redis=%s)", self._redis_url)

    async def _get_pool(self) -> Any:
        if self._pool is None:
            from arq import create_pool
            from arq.connections import RedisSettings

            # Parse redis://host:port/db into RedisSettings
            from urllib.parse import urlparse

            parsed = urlparse(self._redis_url)
            self._pool = await create_pool(
                RedisSettings(
                    host=parsed.hostname or "localhost",
                    port=parsed.port or 6379,
                    database=int(parsed.path.lstrip("/") or "0"),
                    password=parsed.password,
                )
            )
        return self._pool

    async def enqueue(self, job: JobPayload) -> JobResult:
        pool = await self._get_pool()

        # arq uses function name as the job identifier
        arq_fn_name = f"queue__{job.queue}__{job.type}"

        kwargs: dict[str, Any] = {
            "_job_id": job.id,
            "payload": {
                "id": job.id,
                "queue": job.queue,
                "type": job.type,
                "data": job.data,
                "options": {
                    "tenantId": job.options.tenant_id,
                    "maxRetries": job.options.max_retries,
                },
                "createdAt": job.created_at,
            },
        }

        if job.options.delay_sec > 0:
            from datetime import timedelta

            kwargs["_defer_by"] = timedelta(seconds=job.options.delay_sec)

        arq_job = await pool.enqueue_job(arq_fn_name, **kwargs)

        logger.info("arq job enqueued: %s (%s)", job.id, arq_fn_name)

        return JobResult(
            job_id=arq_job.job_id if arq_job else job.id,
            accepted=arq_job is not None,
            provider=QueueProviderType.ARQ,
        )

    def get_arq_functions(self) -> list[Any]:
        """
        Build the arq `functions` list for the WorkerSettings.

        Usage in your worker config:
            from _shared.queue import get_queue_sync
            queue = get_queue_sync()
            class WorkerSettings:
                functions = queue.get_arq_functions()
                redis_settings = ...
        """
        from arq import func as arq_func

        functions = []
        for key, handler in self._handlers.items():
            queue_name, type_name = key.split(":", 1)
            arq_fn_name = f"queue__{queue_name}__{type_name}"

            async def _wrapper(
                _ctx: dict[str, Any],
                payload: dict[str, Any],
                _handler: JobHandlerFn = handler,
            ) -> None:
                job = JobPayload(
                    id=payload["id"],
                    queue=payload["queue"],
                    type=payload["type"],
                    data=payload["data"],
                    created_at=payload["createdAt"],
                    options=JobOptions(
                        tenant_id=payload.get("options", {}).get("tenantId"),
                        max_retries=payload.get("options", {}).get(
                            "maxRetries", 3
                        ),
                    ),
                )
                await _handler(job)

            _wrapper.__qualname__ = arq_fn_name
            functions.append(arq_func(_wrapper, name=arq_fn_name))

        return functions

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
        logger.info("arq provider closed")


# ── Memory Provider ──────────────────────────────────────────────────────────


class MemoryQueueProvider(QueueProvider):
    """In-memory queue for local dev & testing. NOT for production."""

    name = QueueProviderType.MEMORY

    def __init__(self) -> None:
        super().__init__()
        self._pending: list[JobPayload] = []
        logger.info("Memory provider initialised (dev/test only)")

    async def enqueue(self, job: JobPayload) -> JobResult:
        handler = self.get_handler(job.queue, job.type)
        if handler:
            # Process inline on next tick
            asyncio.get_event_loop().call_soon(
                lambda: asyncio.ensure_future(self._process(job, handler))
            )
        else:
            self._pending.append(job)
            logger.warning("No handler for %s:%s — job queued in memory", job.queue, job.type)

        return JobResult(
            job_id=job.id,
            accepted=True,
            provider=QueueProviderType.MEMORY,
        )

    async def _process(self, job: JobPayload, handler: JobHandlerFn) -> None:
        try:
            await handler(job)
            logger.info("Memory job completed: %s", job.id)
        except Exception:
            logger.exception("Memory job failed: %s", job.id)

    async def close(self) -> None:
        self._handlers.clear()
        self._pending.clear()
        logger.info("Memory provider closed")


# ── Factory ──────────────────────────────────────────────────────────────────

_default_provider: QueueProvider | None = None


def _detect_provider() -> QueueProviderType:
    explicit = os.environ.get("QUEUE_PROVIDER", "").lower()
    if explicit == "qstash":
        return QueueProviderType.QSTASH
    if explicit in ("arq", "bullmq", "redis"):
        return QueueProviderType.ARQ
    if explicit == "memory":
        return QueueProviderType.MEMORY

    if os.environ.get("QSTASH_TOKEN"):
        return QueueProviderType.QSTASH
    if os.environ.get("REDIS_URL"):
        return QueueProviderType.ARQ
    return QueueProviderType.MEMORY


async def get_queue(
    provider_type: QueueProviderType | None = None,
) -> QueueProvider:
    """Get or create the default queue provider (singleton)."""
    global _default_provider
    if _default_provider is None:
        pt = provider_type or _detect_provider()
        if pt == QueueProviderType.QSTASH:
            _default_provider = QStashQueueProvider()
        elif pt == QueueProviderType.ARQ:
            _default_provider = ArqQueueProvider()
        else:
            _default_provider = MemoryQueueProvider()
        logger.info("Queue provider created: %s", _default_provider.name.value)
    return _default_provider


def get_queue_sync(
    provider_type: QueueProviderType | None = None,
) -> QueueProvider:
    """Synchronous factory — returns the provider without connecting."""
    global _default_provider
    if _default_provider is None:
        pt = provider_type or _detect_provider()
        if pt == QueueProviderType.QSTASH:
            _default_provider = QStashQueueProvider()
        elif pt == QueueProviderType.ARQ:
            _default_provider = ArqQueueProvider()
        else:
            _default_provider = MemoryQueueProvider()
    return _default_provider


async def close_queue() -> None:
    global _default_provider
    if _default_provider:
        await _default_provider.close()
        _default_provider = None
