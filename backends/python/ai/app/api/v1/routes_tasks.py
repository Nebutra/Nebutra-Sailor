"""Standard task envelope routes for long-running origin work."""

from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from _shared.auth import TenantContext, require_organization
from _shared.task_store import (
    TaskNotFound,
    TaskStoreUnavailable,
    resolve_task_store,
)
from app.tasks.dispatcher import resolve_task_dispatcher
from app.tasks.models import (
    TERMINAL_STATUSES,
    TaskCreateRequest,
    TaskEnvelope,
    TaskStatus,
)

router = APIRouter()
TaskTenant = Annotated[TenantContext, Depends(require_organization)]


@router.post("/", response_model=TaskEnvelope, status_code=202)
async def create_task(
    request: TaskCreateRequest,
    tenant: TaskTenant,
) -> TaskEnvelope:
    try:
        store = resolve_task_store()
        task = await store.create(request, tenant)
        if not task.provider_job_id:
            dispatch = await resolve_task_dispatcher().dispatch(task)
            task = await store.attach_dispatch_result(task.id, task.tenant_id, dispatch)
    except TaskStoreUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail="task_store_not_configured",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if "task" in locals():
            await store.mark_status(
                task.id,
                task.tenant_id,
                TaskStatus.FAILED,
                progress=100,
                error={"code": "task_dispatch_failed", "message": str(exc)},
            )
        raise HTTPException(status_code=502, detail="task_dispatch_failed") from exc

    return task.envelope()


@router.get("/{task_id}", response_model=TaskEnvelope)
async def get_task(
    task_id: str,
    tenant: TaskTenant,
) -> TaskEnvelope:
    try:
        store = resolve_task_store()
        task = await store.get(task_id, tenant.organization_id or "")
    except TaskStoreUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail="task_store_not_configured",
        ) from exc
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail="task_not_found") from exc
    return task.envelope()


@router.get("/{task_id}/events")
async def stream_task_events(
    task_id: str,
    tenant: TaskTenant,
) -> StreamingResponse:
    try:
        store = resolve_task_store()
    except TaskStoreUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail="task_store_not_configured",
        ) from exc

    async def events():
        while True:
            try:
                task = await store.get(task_id, tenant.organization_id or "")
            except TaskNotFound:
                yield 'event: error\ndata: {"detail":"task_not_found"}\n\n'
                return

            envelope = task.envelope()
            yield f"event: task\ndata: {envelope.model_dump_json()}\n\n"
            if envelope.status in TERMINAL_STATUSES:
                return
            await asyncio.sleep(1)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
