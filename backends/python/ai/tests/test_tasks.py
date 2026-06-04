"""Tests for the standard /api/v1/tasks envelope."""

from __future__ import annotations

import hashlib
import hmac
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

TASKS_URL = "/api/v1/tasks/"
TEST_HMAC = "test-auth-value"


def _service_headers(*, signing_key: str, tenant_id: str = "tenant_123"):
    canonical = f"user_123:{tenant_id}:ADMIN:PRO"
    token = hmac.new(
        signing_key.encode(),
        canonical.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "x-service-token": token,
        "x-organization-id": tenant_id,
        "x-user-id": "user_123",
        "x-role": "ADMIN",
        "x-plan": "PRO",
    }


@pytest.mark.asyncio
async def test_create_task_returns_standard_envelope(client, monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_HMAC)
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "memory")

    response = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json={
            "type": "llm.generate",
            "payload": {"prompt": "Summarize this"},
            "idempotency_key": "demo-task-1",
            "metadata": {"source": "test"},
        },
    )

    assert response.status_code == 202
    data = response.json()
    assert data["id"].startswith("task_")
    assert data["type"] == "llm.generate"
    assert data["status"] == "queued"
    assert data["progress"] == 0
    assert data["dispatcher_provider"] == "memory"
    assert data["provider_job_id"].startswith("memory:")
    assert data["metadata"] == {"source": "test"}

    get_response = await client.get(
        f"{TASKS_URL}{data['id']}",
        headers=_service_headers(signing_key=TEST_HMAC),
    )
    assert get_response.status_code == 200
    assert get_response.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_task_idempotency_key_reuses_existing_envelope(client, monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_HMAC)
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "memory")

    payload = {
        "type": "llm.generate",
        "payload": {"prompt": "Once"},
        "idempotency_key": "same-request",
    }
    first = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json=payload,
    )
    second = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json=payload,
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["id"] == second.json()["id"]


@pytest.mark.asyncio
async def test_task_idempotency_does_not_redispatch_existing_envelope(
    client, monkeypatch
):
    monkeypatch.setenv("SERVICE_SECRET", TEST_HMAC)
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "memory")

    payload = {
        "type": "llm.generate",
        "payload": {"prompt": "Only once"},
        "idempotency_key": "same-dispatch",
    }
    first = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json=payload,
    )
    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "unsupported")
    second = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json=payload,
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert second.json()["id"] == first.json()["id"]
    assert second.json()["provider_job_id"] == first.json()["provider_job_id"]


@pytest.mark.asyncio
async def test_production_rejects_memory_task_store_without_database_url(
    client, monkeypatch
):
    monkeypatch.setenv("SERVICE_SECRET", TEST_HMAC)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("TASK_STORE_PROVIDER", raising=False)

    response = await client.post(
        TASKS_URL,
        headers=_service_headers(signing_key=TEST_HMAC),
        json={"type": "llm.generate", "payload": {"prompt": "no db"}},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "task_store_not_configured"


def test_task_dispatcher_selection_is_provider_switchable(monkeypatch):
    from app.tasks.dispatcher import (
        CeleryTaskDispatcher,
        MemoryTaskDispatcher,
        QueueTaskDispatcher,
        resolve_task_dispatcher,
    )

    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "memory")
    assert isinstance(resolve_task_dispatcher(), MemoryTaskDispatcher)

    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "queue")
    assert isinstance(resolve_task_dispatcher(), QueueTaskDispatcher)

    monkeypatch.setenv("TASK_DISPATCHER_PROVIDER", "celery")
    assert isinstance(resolve_task_dispatcher(), CeleryTaskDispatcher)


@pytest.mark.asyncio
async def test_worker_processes_llm_generate_task_to_success(monkeypatch):
    from _shared.auth import TenantContext
    from _shared.task_store import resolve_task_store
    from app.tasks.models import TaskCreateRequest, TaskStatus
    from app.workers.task_envelope import _process_task

    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")

    store = resolve_task_store()
    task = await store.create(
        TaskCreateRequest(
            type="llm.generate",
            payload={"prompt": "hello", "max_tokens": 12},
            idempotency_key="worker-success",
        ),
        TenantContext(
            organization_id="tenant_worker",
            user_id="user_worker",
            role="ADMIN",
            plan="PRO",
            authenticated=True,
        ),
    )
    provider = SimpleNamespace(
        name="mock",
        chat=AsyncMock(
            return_value=SimpleNamespace(
                content="done",
                model="gpt-5.2",
                usage={"total_tokens": 3},
            )
        ),
    )

    with patch(
        "app.workers.task_envelope.get_default_provider",
        Mock(return_value=provider),
    ):
        result = await _process_task(task.id, tenant_id="tenant_worker")

    stored = await store.get(task.id, "tenant_worker")
    assert result == {"taskId": task.id, "status": "succeeded"}
    assert stored.status == TaskStatus.SUCCEEDED
    assert stored.progress == 100
    assert stored.result == {
        "text": "done",
        "model": "gpt-5.2",
        "provider": "mock",
        "usage": {"total_tokens": 3},
    }
