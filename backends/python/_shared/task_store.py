"""Task envelope persistence for Python origin services."""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import replace
from typing import Any, Protocol

from _shared.auth import TenantContext
from app.tasks.models import (
    TERMINAL_STATUSES,
    StoredTask,
    TaskCreateRequest,
    TaskPriority,
    TaskStatus,
    utcnow,
)


class TaskStoreUnavailable(RuntimeError):
    """Raised when production has no persistent task store configured."""


class TaskNotFound(LookupError):
    """Raised when a tenant-scoped task cannot be found."""


class DispatchResultLike(Protocol):
    provider: str
    provider_job_id: str


class TaskStore(Protocol):
    async def create(self, request: TaskCreateRequest, tenant: TenantContext) -> StoredTask: ...

    async def get(self, task_id: str, tenant_id: str) -> StoredTask: ...

    async def attach_dispatch_result(
        self, task_id: str, tenant_id: str, dispatch: DispatchResultLike
    ) -> StoredTask: ...

    async def mark_status(
        self,
        task_id: str,
        tenant_id: str,
        status: TaskStatus,
        *,
        progress: int | None = None,
        result: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
    ) -> StoredTask: ...


def _new_task_id() -> str:
    return f"task_{uuid.uuid4().hex}"


class MemoryTaskStore:
    """In-process store for tests and local development only."""

    def __init__(self) -> None:
        self._tasks: dict[tuple[str, str], StoredTask] = {}
        self._idempotency: dict[tuple[str, str], str] = {}

    async def create(self, request: TaskCreateRequest, tenant: TenantContext) -> StoredTask:
        tenant_id = _require_tenant_id(tenant)
        if request.idempotency_key:
            existing_id = self._idempotency.get((tenant_id, request.idempotency_key))
            if existing_id:
                return await self.get(existing_id, tenant_id)

        now = utcnow()
        task = StoredTask(
            id=_new_task_id(),
            tenant_id=tenant_id,
            user_id=tenant.user_id,
            type=request.type,
            status=TaskStatus.QUEUED,
            progress=0,
            queue=request.queue,
            priority=request.priority,
            payload=request.payload,
            metadata=request.metadata,
            result=None,
            error=None,
            idempotency_key=request.idempotency_key,
            dispatcher_provider=None,
            provider_job_id=None,
            created_at=now,
            updated_at=now,
        )
        self._tasks[(tenant_id, task.id)] = task
        if request.idempotency_key:
            self._idempotency[(tenant_id, request.idempotency_key)] = task.id
        return task

    async def get(self, task_id: str, tenant_id: str) -> StoredTask:
        task = self._tasks.get((tenant_id, task_id))
        if task is None:
            raise TaskNotFound(task_id)
        return task

    async def attach_dispatch_result(
        self, task_id: str, tenant_id: str, dispatch: DispatchResultLike
    ) -> StoredTask:
        task = await self.get(task_id, tenant_id)
        updated = replace(
            task,
            dispatcher_provider=dispatch.provider,
            provider_job_id=dispatch.provider_job_id,
            updated_at=utcnow(),
        )
        self._tasks[(tenant_id, task_id)] = updated
        return updated

    async def mark_status(
        self,
        task_id: str,
        tenant_id: str,
        status: TaskStatus,
        *,
        progress: int | None = None,
        result: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
    ) -> StoredTask:
        task = await self.get(task_id, tenant_id)
        now = utcnow()
        updated = replace(
            task,
            status=status,
            progress=progress if progress is not None else task.progress,
            result=result,
            error=error,
            started_at=now if status == TaskStatus.RUNNING and not task.started_at else task.started_at,
            completed_at=now if status in TERMINAL_STATUSES else task.completed_at,
            updated_at=now,
        )
        self._tasks[(tenant_id, task_id)] = updated
        return updated


class PostgresTaskStore:
    """Postgres-backed task store using the shared Prisma schema table."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _connect(self):  # pragma: no cover - exercised by DB integration tests.
        import asyncpg

        return await asyncpg.connect(self._dsn)

    async def create(  # pragma: no cover - requires a live Postgres fixture.
        self, request: TaskCreateRequest, tenant: TenantContext
    ) -> StoredTask:
        tenant_id = _require_tenant_id(tenant)
        conn = await self._connect()
        try:
            if request.idempotency_key:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.tasks (
                        id, tenant_id, user_id, type, status, priority, progress,
                        payload, metadata, idempotency_key, queue_name, updated_at
                    )
                    VALUES (
                        $1, $2, $3, $4, 'QUEUED', $5::"public"."TaskPriority", 0,
                        $6::jsonb, $7::jsonb, $8, $9, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (tenant_id, idempotency_key)
                    WHERE idempotency_key IS NOT NULL
                    DO UPDATE SET updated_at = public.tasks.updated_at
                    RETURNING *
                    """,
                    _new_task_id(),
                    tenant_id,
                    tenant.user_id,
                    request.type,
                    request.priority.value.upper(),
                    json.dumps(request.payload),
                    json.dumps(request.metadata),
                    request.idempotency_key,
                    request.queue,
                )
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.tasks (
                        id, tenant_id, user_id, type, status, priority, progress,
                        payload, metadata, queue_name, updated_at
                    )
                    VALUES (
                        $1, $2, $3, $4, 'QUEUED', $5::"public"."TaskPriority", 0,
                        $6::jsonb, $7::jsonb, $8, CURRENT_TIMESTAMP
                    )
                    RETURNING *
                    """,
                    _new_task_id(),
                    tenant_id,
                    tenant.user_id,
                    request.type,
                    request.priority.value.upper(),
                    json.dumps(request.payload),
                    json.dumps(request.metadata),
                    request.queue,
                )
            return _row_to_task(row)
        finally:
            await conn.close()

    async def get(  # pragma: no cover - requires a live Postgres fixture.
        self, task_id: str, tenant_id: str
    ) -> StoredTask:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                "SELECT * FROM public.tasks WHERE id = $1 AND tenant_id = $2",
                task_id,
                tenant_id,
            )
            if row is None:
                raise TaskNotFound(task_id)
            return _row_to_task(row)
        finally:
            await conn.close()

    async def attach_dispatch_result(  # pragma: no cover - requires a live Postgres fixture.
        self, task_id: str, tenant_id: str, dispatch: DispatchResultLike
    ) -> StoredTask:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                """
                UPDATE public.tasks
                SET dispatcher_provider = $3,
                    provider_job_id = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
                """,
                task_id,
                tenant_id,
                dispatch.provider,
                dispatch.provider_job_id,
            )
            if row is None:
                raise TaskNotFound(task_id)
            return _row_to_task(row)
        finally:
            await conn.close()

    async def mark_status(  # pragma: no cover - requires a live Postgres fixture.
        self,
        task_id: str,
        tenant_id: str,
        status: TaskStatus,
        *,
        progress: int | None = None,
        result: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
    ) -> StoredTask:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                """
                UPDATE public.tasks
                SET status = $3::"public"."TaskStatus",
                    progress = COALESCE($4, progress),
                    result = $5::jsonb,
                    error = $6::jsonb,
                    started_at = CASE
                        WHEN $3 = 'RUNNING' AND started_at IS NULL
                        THEN CURRENT_TIMESTAMP
                        ELSE started_at
                    END,
                    completed_at = CASE
                        WHEN $3 IN ('SUCCEEDED', 'FAILED', 'CANCELLED') THEN CURRENT_TIMESTAMP
                        ELSE completed_at
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
                """,
                task_id,
                tenant_id,
                status.value.upper(),
                progress,
                json.dumps(result) if result is not None else None,
                json.dumps(error) if error is not None else None,
            )
            if row is None:
                raise TaskNotFound(task_id)
            return _row_to_task(row)
        finally:
            await conn.close()


_memory_store = MemoryTaskStore()


def resolve_task_store() -> TaskStore:
    provider = os.environ.get("TASK_STORE_PROVIDER", "").lower()
    database_url = os.environ.get("DATABASE_URL")
    app_env = os.environ.get("APP_ENV") or os.environ.get("ENV") or os.environ.get("NODE_ENV")
    is_production = (app_env or "").lower() in {"prod", "production"}

    if provider == "memory":
        if is_production:
            raise TaskStoreUnavailable("memory task store is not allowed in production")
        return _memory_store

    if provider in {"postgres", "postgresql"} or database_url:
        if not database_url:
            raise TaskStoreUnavailable("DATABASE_URL is required for postgres task store")
        return PostgresTaskStore(database_url)

    if is_production:
        raise TaskStoreUnavailable("DATABASE_URL is required for production task store")

    return _memory_store


def _require_tenant_id(tenant: TenantContext) -> str:
    if not tenant.organization_id:
        raise ValueError("tenant organization is required")
    return tenant.organization_id


def _decode_json(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def _row_to_task(row: Any) -> StoredTask:
    return StoredTask(
        id=row["id"],
        tenant_id=row["tenant_id"],
        user_id=row["user_id"],
        type=row["type"],
        status=TaskStatus(row["status"].lower()),
        progress=row["progress"],
        queue=row["queue_name"],
        priority=TaskPriority(row["priority"].lower()),
        payload=_decode_json(row["payload"]) or {},
        metadata=_decode_json(row["metadata"]) or {},
        result=_decode_json(row["result"]),
        error=_decode_json(row["error"]),
        idempotency_key=row["idempotency_key"],
        dispatcher_provider=row["dispatcher_provider"],
        provider_job_id=row["provider_job_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        started_at=row["started_at"],
        completed_at=row["completed_at"],
    )
