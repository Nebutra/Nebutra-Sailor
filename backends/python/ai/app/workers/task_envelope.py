"""Celery entry point for standard task envelopes."""

from __future__ import annotations

import asyncio

from _shared.task_store import resolve_task_store
from app.tasks.handlers import HANDLERS, TaskFailureError
from app.tasks.models import TaskStatus
from app.workers.celery_app import celery_app

# Time limits. Celery sets none by default, so a hung vendor call would hold one of the
# worker's two slots forever. Video is the long pole: the adapter's own bounded wait
# (PARA_VIDEO_MAX_WAIT_SECONDS, default 20 min) fails the task with a typed
# `provider_timeout` first; these are the backstop above it, soft then hard. Both stay
# below the Redis broker's visibility timeout (celery_app.py), or an unacked late-ack
# task would be redelivered and generated — and paid for at the vendor — twice.
TASK_SOFT_TIME_LIMIT_SECONDS = 25 * 60
TASK_TIME_LIMIT_SECONDS = 30 * 60


@celery_app.task(
    name="app.workers.task_envelope.process_task",
    soft_time_limit=TASK_SOFT_TIME_LIMIT_SECONDS,
    time_limit=TASK_TIME_LIMIT_SECONDS,
)
def process_task(task_id: str, *, tenant_id: str) -> dict[str, str]:
    return asyncio.run(_process_task(task_id, tenant_id=tenant_id))


async def _process_task(task_id: str, *, tenant_id: str) -> dict[str, str]:
    store = resolve_task_store()
    task = await store.mark_status(task_id, tenant_id, TaskStatus.RUNNING, progress=1)

    handler = HANDLERS.get(task.type)
    if handler is None:
        await store.mark_status(
            task_id,
            tenant_id,
            TaskStatus.FAILED,
            progress=100,
            error={
                "code": "task_handler_not_registered",
                "message": f"No handler registered for task type {task.type}",
            },
        )
        return {"taskId": task_id, "status": TaskStatus.FAILED.value}

    async def progress(value: int) -> None:
        await store.mark_status(
            task_id, tenant_id, TaskStatus.RUNNING, progress=max(1, min(99, value))
        )

    try:
        result = await handler(task, progress)
    except TaskFailureError as exc:
        await store.mark_status(
            task_id, tenant_id, TaskStatus.FAILED, progress=100, error=exc.as_error()
        )
        return {"taskId": task_id, "status": TaskStatus.FAILED.value}
    except Exception as exc:
        await store.mark_status(
            task_id,
            tenant_id,
            TaskStatus.FAILED,
            progress=100,
            error={"code": "task_handler_failed", "message": str(exc)},
        )
        raise

    await store.mark_status(
        task_id, tenant_id, TaskStatus.SUCCEEDED, progress=100, result=result
    )
    return {"taskId": task_id, "status": TaskStatus.SUCCEEDED.value}
