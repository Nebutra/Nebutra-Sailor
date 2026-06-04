"""Celery entry point for standard task envelopes."""

from __future__ import annotations

import asyncio
import os

from _shared.task_store import resolve_task_store
from app.tasks.models import TaskStatus
from app.workers.celery_app import celery_app
from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider


@celery_app.task(name="app.workers.task_envelope.process_task")
def process_task(task_id: str, *, tenant_id: str) -> dict[str, str]:
    return asyncio.run(_process_task(task_id, tenant_id=tenant_id))


async def _process_task(task_id: str, *, tenant_id: str) -> dict[str, str]:
    store = resolve_task_store()
    task = await store.mark_status(task_id, tenant_id, TaskStatus.RUNNING, progress=1)

    try:
        if task.type == "llm.generate":
            result = await _handle_generate(task.payload)
            await store.mark_status(
                task_id,
                tenant_id,
                TaskStatus.SUCCEEDED,
                progress=100,
                result=result,
            )
            return {"taskId": task_id, "status": TaskStatus.SUCCEEDED.value}

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
    except Exception as exc:
        await store.mark_status(
            task_id,
            tenant_id,
            TaskStatus.FAILED,
            progress=100,
            error={"code": "task_handler_failed", "message": str(exc)},
        )
        raise


async def _handle_generate(payload: dict) -> dict:
    provider = get_default_provider()
    messages = payload.get("messages")
    prompt = payload.get("prompt")
    if messages:
        chat_messages = [
            ChatMessage(role=item.get("role", "user"), content=item["content"])
            for item in messages
        ]
    elif prompt:
        chat_messages = [ChatMessage(role="user", content=prompt)]
    else:
        raise ValueError("Either messages or prompt is required")

    chat_request = ChatCompletionRequest(
        model=payload.get("model")
        or os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct"),
        messages=chat_messages,
        temperature=float(payload.get("temperature", 0.7)),
        max_tokens=int(payload.get("max_tokens", 2048)),
        stream=False,
    )
    response = await provider.chat(chat_request)
    return {
        "text": response.content or "",
        "model": response.model,
        "provider": provider.name,
        "usage": response.usage,
    }
