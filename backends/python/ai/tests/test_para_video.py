"""para.generate video + audio: registry, DashScope Wan adapter, handler, model list."""

from __future__ import annotations

import json
import re
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from _shared.auth import TenantContext
from _shared.task_store import resolve_task_store
from app.api.v1.routes_para import para_catalogue
from app.tasks.models import TaskCreateRequest, TaskStatus
from app.workers.task_envelope import _process_task
from providers.audio import DashScopeSpeechProvider, SpeechRequest
from providers.video import (
    MODELS,
    VideoGenerationError,
    catalogue,
    live_models,
    normalize_request,
    resolve_model,
)
from providers.video.dashscope import DashScopeVideoAdapter
from providers.video.registry import auto_model, snap_duration

TENANT = TenantContext(
    organization_id="tenant_para",
    user_id="user_para",
    role="ADMIN",
    plan="PRO",
    authenticated=True,
)
WAN = next(spec for spec in MODELS if spec.id == "wan-2.7")
ON = {"DASHSCOPE_API_KEY": "ds"}


class FakeClock:
    """PollClock stand-in: no sleeping, expires after `ticks` polls."""

    def __init__(self, *, ticks: int = 100, **_: object) -> None:
        self.left = ticks

    def expired(self) -> bool:
        return self.left <= 0

    def percent(self) -> int:
        return 50

    async def tick(self) -> None:
        self.left -= 1


def _clock(ticks: int = 100):
    return lambda **kw: FakeClock(ticks=ticks, **kw)


# ── registry ────────────────────────────────────────────────────────────────


def test_liveness_follows_keys_and_planned_models_never_run():
    assert live_models({}) == []
    assert [s.id for s in live_models(ON)] == ["wan-2.7"]
    assert auto_model({}) is None
    assert auto_model(ON).id == "wan-2.7"
    with pytest.raises(VideoGenerationError) as exc:
        resolve_model("seedance-2.5", ON)
    assert exc.value.code == "model_unavailable"
    with pytest.raises(VideoGenerationError) as exc:
        resolve_model("wan-2.7", {})
    assert exc.value.code == "provider_unconfigured"
    with pytest.raises(VideoGenerationError) as exc:
        resolve_model("Seedance 2.5", ON)
    assert exc.value.code == "unsupported_model"
    with pytest.raises(VideoGenerationError) as exc:
        resolve_model("Auto", {})
    assert exc.value.code == "provider_unconfigured"


def test_catalogue_lists_live_then_planned_and_hides_keyless():
    off = catalogue({})
    assert off["auto"] is None
    assert all(m["status"] == "planned" and m["live"] is False for m in off["models"])
    on = catalogue(ON)
    assert on["auto"] == "wan-2.7"
    assert on["models"][0]["id"] == "wan-2.7" and on["models"][0]["live"] is True
    ids = {m["id"] for m in on["models"]}
    assert {"seedance-2.5", "kling-3", "veo-3.1", "minimax-h3"} <= ids


def test_duration_snaps_like_the_gateway():
    assert snap_duration(WAN, 10) == 10
    assert snap_duration(WAN, "10s") == 10
    assert snap_duration(WAN, 99) == 15
    assert snap_duration(WAN, 0) == 2
    assert snap_duration(WAN, "five") == 5
    assert snap_duration(WAN, True) == 5
    veo = next(s for s in MODELS if s.id == "veo-3.1")
    assert snap_duration(veo, 5) == 6  # tie between 4 and 6 goes up
    assert snap_duration(veo, 7.9) == 8


def test_normalize_request_maps_canvas_params():
    req = normalize_request(
        WAN,
        prompt="p",
        params={"ratio": "9:16", "resolution": "1k", "duration": "8s", "seed": "42"},
        first_frame_url=None,
    )
    assert (req.aspect, req.resolution, req.duration_seconds, req.seed) == (
        "9:16",
        "720P",
        8,
        42,
    )


def test_registry_matches_the_gateway_price_table():
    """Durations, resolutions and defaults must agree with @nebutra/billing/prices."""
    prices = (
        Path(__file__).resolve().parents[4]
        / "packages/commerce/billing/src/prices/index.ts"
    )
    if not prices.exists():
        pytest.skip("billing package not in this checkout")
    source = prices.read_text()
    table = source[source.index("PARA_VIDEO_MODELS") :]
    for spec in MODELS:
        start = table.index(f'"{spec.id}": {{')
        block = table[start : table.index("\n  },", start)]
        span = re.search(r"durations: span\((\d+), (\d+)\)", block)
        if span:
            durations = tuple(range(int(span[1]), int(span[2]) + 1))
        else:
            listed = re.search(r"durations: \[([\d, ]+)\]", block)
            assert listed, spec.id
            durations = tuple(int(x) for x in listed[1].split(","))
        assert durations == spec.durations, spec.id
        assert f"defaultDuration: {spec.default_duration}," in block, spec.id
        resolutions = re.search(r"resolutions: (\[[^\]]*\])", block)
        assert resolutions and tuple(json.loads(resolutions[1])) == spec.resolutions
        assert f'defaultResolution: "{spec.default_resolution}"' in block, spec.id
        assert f'status: "{spec.status}"' in block, spec.id
    order = re.search(r"PARA_VIDEO_AUTO_ORDER[^=]*= \[([^\]]*)\]", source)
    assert order
    from providers.video.registry import AUTO_PREFERENCE

    assert tuple(re.findall(r'"([^"]+)"', order[1])) == AUTO_PREFERENCE


# ── DashScope Wan adapter ───────────────────────────────────────────────────


def test_wan_body_text_to_video_and_first_frame():
    adapter = DashScopeVideoAdapter("k")
    t2v = adapter.build_body(
        WAN,
        normalize_request(
            WAN,
            prompt="waves",
            params={"aspect": "1:1", "duration": 10},
            first_frame_url=None,
        ),
    )
    assert t2v == {
        "model": "wan2.7-t2v",
        "input": {"prompt": "waves"},
        "parameters": {
            "resolution": "720P",
            "duration": 10,
            "watermark": False,
            "ratio": "1:1",
        },
    }
    i2v = adapter.build_body(
        WAN,
        normalize_request(
            WAN, prompt="move", params={}, first_frame_url="https://cdn.para.test/f.png"
        ),
    )
    assert i2v["model"] == "wan2.7-i2v"
    assert i2v["input"]["media"] == [
        {"type": "first_frame", "url": "https://cdn.para.test/f.png"}
    ]
    assert "ratio" not in i2v["parameters"]


def _wan_transport(statuses: list[dict], seen: dict):
    polls = iter(statuses)

    def route(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/video-generation/video-synthesis"):
            seen["submit_headers"] = dict(request.headers)
            seen["body"] = json.loads(request.read())
            return httpx.Response(
                200, json={"output": {"task_id": "t-1", "task_status": "PENDING"}}
            )
        if url.endswith("/api/v1/tasks/t-1"):
            seen["polls"] = seen.get("polls", 0) + 1
            return httpx.Response(200, json=next(polls))
        return httpx.Response(404)

    return httpx.MockTransport(route)


@pytest.mark.asyncio
async def test_wan_submit_poll_running_then_succeeded():
    seen: dict = {}
    transport = _wan_transport(
        [
            {"output": {"task_status": "RUNNING"}},
            {
                "output": {
                    "task_status": "SUCCEEDED",
                    "video_url": "https://oss/v.mp4",
                },
                "usage": {"duration": 5, "SR": 720},
            },
        ],
        seen,
    )
    reported: list[int] = []

    async def progress(value: int) -> None:
        reported.append(value)

    adapter = DashScopeVideoAdapter(
        "k", client=httpx.AsyncClient(transport=transport), clock_factory=_clock()
    )
    out = await adapter.generate(
        WAN,
        normalize_request(WAN, prompt="waves", params={}, first_frame_url=None),
        progress,
    )
    assert out.url == "https://oss/v.mp4"
    assert out.model == "wan-2.7" and out.vendor_model == "wan2.7-t2v"
    assert out.duration_seconds == 5
    assert seen["submit_headers"]["x-dashscope-async"] == "enable"
    assert seen["submit_headers"]["authorization"] == "Bearer k"
    assert seen["polls"] == 2
    assert reported == [50]


@pytest.mark.asyncio
async def test_wan_task_failure_is_typed():
    transport = _wan_transport(
        [
            {
                "output": {
                    "task_status": "FAILED",
                    "code": "DataInspectionFailed",
                    "message": "unsafe",
                }
            }
        ],
        {},
    )
    adapter = DashScopeVideoAdapter(
        "k", client=httpx.AsyncClient(transport=transport), clock_factory=_clock()
    )
    with pytest.raises(VideoGenerationError) as exc:
        await adapter.generate(
            WAN, normalize_request(WAN, prompt="x", params={}, first_frame_url=None)
        )
    assert exc.value.code == "provider_datainspectionfailed"
    assert exc.value.retryable is False


@pytest.mark.asyncio
async def test_wan_times_out_after_bounded_wait():
    transport = _wan_transport([{"output": {"task_status": "RUNNING"}}] * 10, {})
    adapter = DashScopeVideoAdapter(
        "k", client=httpx.AsyncClient(transport=transport), clock_factory=_clock(3)
    )
    with pytest.raises(VideoGenerationError) as exc:
        await adapter.generate(
            WAN, normalize_request(WAN, prompt="x", params={}, first_frame_url=None)
        )
    assert exc.value.code == "provider_timeout"
    assert exc.value.retryable is True


@pytest.mark.asyncio
async def test_wan_submit_rejection_is_typed():
    def route(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"code": "Throttling", "message": "slow"})

    adapter = DashScopeVideoAdapter(
        "k", client=httpx.AsyncClient(transport=httpx.MockTransport(route))
    )
    with pytest.raises(VideoGenerationError) as exc:
        await adapter.generate(
            WAN, normalize_request(WAN, prompt="x", params={}, first_frame_url=None)
        )
    assert exc.value.code == "provider_throttling"
    assert exc.value.retryable is True


# ── handler ─────────────────────────────────────────────────────────────────


async def _create(payload: dict, *, key: str):
    return await resolve_task_store().create(
        TaskCreateRequest(type="para.generate", payload=payload, idempotency_key=key),
        TENANT,
    )


def _patched(route):
    transport = httpx.MockTransport(route)
    real = httpx.AsyncClient

    def client(*args, **kwargs):
        kwargs["transport"] = transport
        return real(*args, **kwargs)

    return client


@pytest.mark.asyncio
async def test_para_generate_video_persists_mp4_and_reports_seconds(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds-test")
    monkeypatch.setenv("UPLOAD_PUBLIC_BASE_URL", "https://cdn.para.test")
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n7",
            "generator": {
                "mode": "video",
                "model": "wan-2.7",
                "prompt": "the tide turns",
                "params": {"duration": 10, "resolution": "720P", "ratio": "9:16"},
                "references": [
                    {"kind": "node", "id": "n1", "url": "https://cdn.para.test/f.png"}
                ],
            },
        },
        key="para-video-ok",
    )
    seen: dict = {}

    def route(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/video-synthesis"):
            seen["body"] = json.loads(request.read())
            return httpx.Response(200, json={"output": {"task_id": "t-9"}})
        if url.endswith("/api/v1/tasks/t-9"):
            return httpx.Response(
                200,
                json={
                    "output": {
                        "task_status": "SUCCEEDED",
                        "video_url": "https://oss/v.mp4",
                    },
                    "usage": {"duration": 10},
                },
            )
        if url == "https://oss/v.mp4":
            # Vendor CDNs often mislabel video; the handler pins video/mp4.
            return httpx.Response(
                200,
                content=b"MP4BYTES!",
                headers={"content-type": "application/octet-stream"},
            )
        if "/upload?" in url:
            seen["put"] = url
            return httpx.Response(200)
        return httpx.Response(404)

    client = _patched(route)
    with (
        patch("providers.video.dashscope.httpx.AsyncClient", client),
        patch("app.uploads.persist.httpx.AsyncClient", client),
        patch("providers.video.dashscope.PollClock", FakeClock),
    ):
        result = await _process_task(task.id, tenant_id="tenant_para")

    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert result["status"] == "succeeded", stored.error
    assert stored.status == TaskStatus.SUCCEEDED
    out = stored.result
    assert out["mode"] == "video"
    assert out["model"] == "wan-2.7" and out["provider"] == "dashscope"
    assert out["vendorModel"] == "wan2.7-i2v"
    assert out["usage"]["seconds"] == 10
    asset = out["assets"][0]
    assert asset["key"] == f"para/tenant_para/ws1/n7/{task.id}-1.mp4"
    assert (
        asset["url"] == f"https://cdn.para.test/para/tenant_para/ws1/n7/{task.id}-1.mp4"
    )
    assert asset["contentType"] == "video/mp4"
    assert asset["size"] == 9
    assert seen["body"]["input"]["media"][0]["url"] == "https://cdn.para.test/f.png"
    assert seen["body"]["parameters"]["duration"] == 10


@pytest.mark.asyncio
async def test_para_generate_video_planned_model_fails_closed(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds-test")
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n1",
            "generator": {"mode": "video", "model": "kling-3", "prompt": "x"},
        },
        key="para-video-planned",
    )
    await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert stored.status == TaskStatus.FAILED
    assert stored.error["code"] == "model_unavailable"


@pytest.mark.asyncio
async def test_para_generate_video_without_key_is_typed(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n1",
            "generator": {"mode": "video", "prompt": "x"},
        },
        key="para-video-nokey",
    )
    await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert stored.error["code"] == "provider_unconfigured"


@pytest.mark.asyncio
async def test_para_generate_audio_persists_wav(monkeypatch):
    monkeypatch.setenv("TASK_STORE_PROVIDER", "memory")
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds-test")
    monkeypatch.setenv("UPLOAD_PUBLIC_BASE_URL", "https://cdn.para.test")
    task = await _create(
        {
            "workspaceId": "ws1",
            "nodeId": "n3",
            "generator": {
                "mode": "audio",
                "prompt": "The tide turns at dawn.",
                "params": {"voice": "Ethan"},
            },
        },
        key="para-audio-ok",
    )
    seen: dict = {}

    def route(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/multimodal-generation/generation"):
            seen["body"] = json.loads(request.read())
            return httpx.Response(
                200,
                json={
                    "output": {"audio": {"url": "https://oss/a.wav", "data": ""}},
                    "usage": {"characters": 23},
                },
            )
        if url == "https://oss/a.wav":
            return httpx.Response(
                200, content=b"RIFF", headers={"content-type": "audio/wav"}
            )
        if "/upload?" in url:
            return httpx.Response(200)
        return httpx.Response(404)

    client = _patched(route)
    with (
        patch("providers.audio.httpx.AsyncClient", client),
        patch("app.uploads.persist.httpx.AsyncClient", client),
    ):
        await _process_task(task.id, tenant_id="tenant_para")
    stored = await resolve_task_store().get(task.id, "tenant_para")
    assert stored.status == TaskStatus.SUCCEEDED, stored.error
    assert stored.result["mode"] == "audio"
    assert stored.result["voice"] == "Ethan"
    assert stored.result["assets"][0]["key"].endswith(f"{task.id}-1.wav")
    assert stored.result["assets"][0]["contentType"] == "audio/wav"
    assert seen["body"] == {
        "model": "qwen3-tts-flash",
        "input": {"text": "The tide turns at dawn.", "voice": "Ethan"},
    }


def test_speech_rejects_bad_voice_and_long_text():
    from providers.audio import SpeechGenerationError

    provider = DashScopeSpeechProvider("k")
    with pytest.raises(SpeechGenerationError):
        provider.build_body(SpeechRequest(text="hi", voice="x; drop"))
    with pytest.raises(SpeechGenerationError):
        provider.build_body(SpeechRequest(text="a" * 601))


# ── model list ──────────────────────────────────────────────────────────────


def test_model_list_reflects_env(monkeypatch):
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    off = para_catalogue()["modes"]
    assert off["image"]["models"] == [] and off["audio"]["models"] == []
    assert off["video"]["auto"] is None
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds")
    on = para_catalogue()["modes"]
    assert on["image"]["auto"] == "qwen-image-2.0"
    assert on["video"]["auto"] == "wan-2.7"
    assert on["audio"]["auto"] == "qwen3-tts-flash"


@pytest.mark.asyncio
async def test_model_list_route(client, monkeypatch):
    from tests.test_tasks import TEST_SIGNING_VALUE, _service_headers

    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    monkeypatch.setenv("DASHSCOPE_API_KEY", "ds")
    unauthenticated = await client.get("/api/v1/para/models")
    assert unauthenticated.status_code in (401, 403)
    response = await client.get(
        "/api/v1/para/models",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
    )
    assert response.status_code == 200
    assert response.json()["modes"]["video"]["auto"] == "wan-2.7"
