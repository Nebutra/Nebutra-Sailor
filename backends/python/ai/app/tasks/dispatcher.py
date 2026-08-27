"""Provider-switchable task dispatch for the standard task envelope."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol

from _shared.queue import JobOptions, create_job, get_queue
from app.tasks.models import StoredTask


@dataclass(frozen=True)
class TaskDispatchResult:
    provider: str
    provider_job_id: str


class TaskDispatcher(Protocol):
    async def dispatch(self, task: StoredTask) -> TaskDispatchResult: ...


class MemoryTaskDispatcher:
    async def dispatch(self, task: StoredTask) -> TaskDispatchResult:
        return TaskDispatchResult(
            provider="memory",
            provider_job_id=f"memory:{task.id}",
        )


class QueueTaskDispatcher:
    async def dispatch(self, task: StoredTask) -> TaskDispatchResult:
        queue = await get_queue()
        job = create_job(
            task.queue,
            task.type,
            {"taskId": task.id, "tenantId": task.tenant_id},
            options=JobOptions(
                idempotency_key=task.idempotency_key,
                tenant_id=task.tenant_id,
                metadata={"taskId": task.id},
            ),
        )
        result = await queue.enqueue(job)
        return TaskDispatchResult(
            provider=result.provider.value,
            provider_job_id=result.job_id,
        )


class CeleryTaskDispatcher:
    async def dispatch(self, task: StoredTask) -> TaskDispatchResult:
        from app.workers.celery_app import celery_app

        result = celery_app.send_task(
            "app.workers.task_envelope.process_task",
            args=[task.id],
            kwargs={"tenant_id": task.tenant_id},
            queue=task.queue,
        )
        return TaskDispatchResult(provider="celery", provider_job_id=result.id)


def resolve_task_dispatcher() -> TaskDispatcher:
    provider = os.environ.get("TASK_DISPATCHER_PROVIDER", "").lower()
    if not provider:
        provider = "celery" if os.environ.get("CELERY_BROKER_URL") else "queue"

    if provider == "celery":
        return CeleryTaskDispatcher()
    if provider == "queue":
        return QueueTaskDispatcher()
    if provider == "memory":
        return MemoryTaskDispatcher()
    raise ValueError(f"Unsupported TASK_DISPATCHER_PROVIDER: {provider}")
