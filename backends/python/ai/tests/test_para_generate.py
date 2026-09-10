"""para.generate handler: image mode via the DashScope seat, persisted to storage."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from _shared.auth import TenantContext
from _shared.task_store import resolve_task_store
from app.tasks.models import TaskCreateRequest, TaskStatus
from app.workers.task_envelope import _process_task
from providers.image.base import ImageGenerationError, ImageGenerationRequest
from providers.image.dashscope import DashScopeImageProvider

TENANT = TenantContext(
    organization_id="tenant_para",
    user_id="user_para",
    role="ADMIN",
    plan="PRO",
    authenticated=True,
)


def _dashscope_ok(urls: list[str]) -> dict:
    return {
        "output": {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": [{"image": url} for url in urls],
                    }
                }
            ]
        },
        "usage": {"image_count": len(urls)},
        "request_id": "req_1",
    }


async def _create(payload: dict, *, key: str):
    store = resolve_task_store()
    return await store.create(
        TaskCreateRequest(type="para.generate", payload=payload, idempotency_key=key),
        TENANT,
    )


def test_dashscope_builds_t2i_body_with_size_from_aspect():
    provider = DashScopeImageProvider("key")
    body = provider.build_body(
        ImageGenerationRequest(prompt="a colder shore", aspect="9:16", n=2)
    )
    assert body["model"] == "qwen-image-2.0"
    assert body["parameters"] == {"n": 2, "size": "928*1664", "watermark": False}
    assert body["input"]["messages"][0]["content"] == [{"text": "a colder shore"}]


def test_dashscope_switches_to_edit_model_with_references():
    provider = DashScopeImageProvider("key")
    body = provider.build_body(
        ImageGenerationRequest(
            prompt="same, at night", reference_urls=("https://cdn/a.png",)
        )
    )
    assert body["model"] == "qwen-image-edit-plus"
    assert body["input"]["messages"][0]["content"][0] == {"image": "https://cdn/a.png"}


@pytest.mark.asyncio
async def test_dashscope_maps_provider_errors_to_typed_failures():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429, json={"code": "Throttling.RateQuota", "message": "slow down"}
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = DashScopeImageProvider("key", client=client)
    with pytest.raises(ImageGenerationError) as excinfo:
        await provider.generate(ImageGenerationRequest(prompt="x"))
    assert excinfo.value.code == "provider_throttling.ratequota"
    assert excinfo.value.retryable is True


@pytest.mark.asyncio
async def test_para_generate_image_persists_output_and_succeeds(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds-test")
    monkeypatch.setenv("UPLOAD_PUBLIC_BASE_URL", "https://cdn.para.test")

    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n9",
            "generator": {
                "mode": "image",
                "prompt": "colder",
                "params": {"aspect": "1:1"},
            },
        },
        key="para-image-ok",
    )

    seen: dict[str, object] = {}

    def route(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/multimodal-generation/generation"):
            seen["body"] = request.read()
            return httpx.Response(
                200, json=_dashscope_ok(["https://tmp.dashscope/out.png"])
            )
        if url == "https://tmp.dashscope/out.png":
            return httpx.Response(
                200, content=b"PNGBYTES", headers={"content-type": "image/png"}
            )
        if "/upload?" in url:
            seen["put_key"] = url
            return httpx.Response(200)
        return httpx.Response(404)

    transport = httpx.MockTransport(route)
    real_client = httpx.AsyncClient

    def patched_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with (
        patch("providers.image.dashscope.httpx.AsyncClient", patched_client),
        patch("app.uploads.persist.httpx.AsyncClient", patched_client),
    ):
        result = await _process_task(task.id, tenant_id="tenant_para")

    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert result["status"] == "succeeded"
    assert stored.status == TaskStatus.SUCCEEDED
    assert stored.result["mode"] == "image"
    asset = stored.result["assets"][0]
    assert asset["url"].startswith("https://cdn.para.test/para/tenant_para/ws1/n9/")
    assert asset["contentType"] == "image/png"
    assert asset["size"] == 8
    assert (
        b'"size": "1328*1328"' in seen["body"] or b'"size":"1328*1328"' in seen["body"]
    )


@pytest.mark.asyncio
async def test_para_generate_unsupported_mode_fails_closed(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n1",
            "generator": {"mode": "video", "prompt": "x"},
        },
        key="para-video",
    )
    result = await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert result["status"] == "failed"
    assert stored.error["code"] == "unsupported_mode"


@pytest.mark.asyncio
async def test_para_generate_without_provider_is_typed(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    monkeypatch.delenv("IMAGE_PROVIDER", raising=False)
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n1",
            "generator": {"mode": "image", "prompt": "x"},
        },
        key="para-noprov",
    )
    await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert stored.status == TaskStatus.FAILED
    assert stored.error["code"] == "provider_unconfigured"


@pytest.mark.asyncio
async def test_para_generate_text_mode_uses_llm_provider(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n2",
            "generator": {"mode": "text", "prompt": "logline"},
        },
        key="para-text",
    )
    provider = SimpleNamespace(
        name="mock",
        chat=AsyncMock(
            return_value=SimpleNamespace(content="A cold open.", model="m", usage={})
        ),
    )
    with patch("app.tasks.handlers.get_default_provider", lambda: provider):
        await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert stored.status == TaskStatus.SUCCEEDED
    assert stored.result["text"] == "A cold open."
    assert stored.result["mode"] == "text"
