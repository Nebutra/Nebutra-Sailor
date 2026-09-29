"""DashScope (Alibaba Cloud Bailian) video adapter — Wan 2.7.

Models (Bailian model market, family wan-text-to-video / wan-image-to-video):
  text-to-video   wan2.7-t2v
  image-to-video  wan2.7-i2v   (first frame via input.media[{type: first_frame}])
Docs: Bailian "万相2.7-文生视频API参考" and "万相2.7-图生视频API参考"
(raw/model-api-reference/video-generation-api/wan-api-reference/, read 2026-09-28).

Protocol:
  POST {base}/api/v1/services/aigc/video-generation/video-synthesis
       headers X-DashScope-Async: enable
       → {"output": {"task_id", "task_status": "PENDING"}, "request_id"}
  GET  {base}/api/v1/tasks/{task_id}
       → output.task_status PENDING | RUNNING | SUCCEEDED | FAILED | CANCELED | UNKNOWN
         SUCCEEDED carries output.video_url (MP4, valid 24 h) and usage.duration.
The docs recommend the per-workspace host ({WorkspaceId}.cn-beijing.maas.aliyuncs.com)
but state the existing https://dashscope.aliyuncs.com keeps working; DASHSCOPE_BASE_URL
switches it. wan3.0-video (newer, up to 30 s) is documented on workspace hosts only, so
it is not registered until that host is configured and verified.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from providers.video.base import (
    PollClock,
    ProgressFn,
    VideoGenerationError,
    VideoGenerationRequest,
    VideoGenerationResponse,
    max_wait_seconds,
)
from providers.video.registry import VideoModelSpec

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class DashScopeVideoAdapter:
    vendor = "dashscope"

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        client: httpx.AsyncClient | None = None,
        poll_interval: float = 10.0,
        max_wait: float | None = None,
        clock_factory: Any = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._client = client
        self._poll_interval = poll_interval
        self._max_wait = max_wait if max_wait is not None else max_wait_seconds()
        self._clock_factory = clock_factory

    @property
    def submit_url(self) -> str:
        return f"{self._base_url}/api/v1/services/aigc/video-generation/video-synthesis"

    def task_url(self, task_id: str) -> str:
        return f"{self._base_url}/api/v1/tasks/{task_id}"

    def build_body(
        self, spec: VideoModelSpec, request: VideoGenerationRequest
    ) -> dict[str, Any]:
        input_: dict[str, Any] = {"prompt": request.prompt}
        if request.negative_prompt:
            input_["negative_prompt"] = request.negative_prompt
        parameters: dict[str, Any] = {
            "resolution": spec.vendor_resolution(request.resolution),
            "duration": request.duration_seconds,
            "watermark": False,
        }
        if request.seed is not None:
            parameters["seed"] = request.seed
        if request.first_frame_url:
            model = spec.i2v_model
            input_["media"] = [{"type": "first_frame", "url": request.first_frame_url}]
        else:
            model = spec.t2v_model
            parameters["ratio"] = request.aspect
        return {"model": model, "input": input_, "parameters": parameters}

    def _headers(self, *, submit: bool) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        if submit:
            headers["Content-Type"] = "application/json"
            headers["X-DashScope-Async"] = "enable"
        return headers

    async def _call(
        self, client: httpx.AsyncClient, method: str, url: str, **kwargs: Any
    ) -> dict[str, Any]:
        try:
            response = await client.request(method, url, **kwargs)
        except httpx.TimeoutException as exc:
            raise VideoGenerationError(
                "provider_timeout", str(exc), retryable=True
            ) from exc
        except httpx.HTTPError as exc:
            raise VideoGenerationError(
                "provider_unreachable", str(exc), retryable=True
            ) from exc
        try:
            payload: dict[str, Any] = response.json()
        except ValueError as exc:
            raise VideoGenerationError(
                "provider_bad_response", f"non-JSON response ({response.status_code})"
            ) from exc
        if response.status_code >= 400 or payload.get("code"):
            code = str(payload.get("code") or f"http_{response.status_code}")
            raise VideoGenerationError(
                f"provider_{code.lower()}",
                str(payload.get("message") or response.text[:300]),
                retryable=response.status_code in RETRYABLE_STATUS,
            )
        return payload

    async def generate(
        self,
        spec: VideoModelSpec,
        request: VideoGenerationRequest,
        progress: ProgressFn | None = None,
    ) -> VideoGenerationResponse:
        if not request.prompt.strip() and not request.first_frame_url:
            raise VideoGenerationError("invalid_prompt", "prompt is required")
        body = self.build_body(spec, request)
        client = self._client or httpx.AsyncClient(timeout=60.0)
        try:
            submitted = await self._call(
                client,
                "POST",
                self.submit_url,
                json=body,
                headers=self._headers(submit=True),
            )
            task_id = str((submitted.get("output") or {}).get("task_id") or "")
            if not task_id:
                raise VideoGenerationError(
                    "provider_bad_response", "submit returned no task_id"
                )

            clock = (self._clock_factory or PollClock)(
                max_wait=self._max_wait, interval=self._poll_interval
            )
            while True:
                if clock.expired():
                    raise VideoGenerationError(
                        "provider_timeout",
                        f"video task {task_id} did not finish in "
                        f"{int(self._max_wait)}s",
                        retryable=True,
                    )
                await clock.tick()
                polled = await self._call(
                    client,
                    "GET",
                    self.task_url(task_id),
                    headers=self._headers(submit=False),
                )
                output = polled.get("output") or {}
                status = str(output.get("task_status") or "").upper()
                if status == "SUCCEEDED":
                    url = output.get("video_url")
                    if not isinstance(url, str) or not url:
                        raise VideoGenerationError(
                            "no_output", "provider returned no video"
                        )
                    return VideoGenerationResponse(
                        url=url,
                        model=spec.id,
                        provider=self.vendor,
                        vendor_model=str(body["model"]),
                        duration_seconds=request.duration_seconds,
                        usage=dict(polled.get("usage") or {}),
                        provider_task_id=task_id,
                    )
                if status in {"FAILED", "CANCELED", "UNKNOWN"}:
                    code = str(output.get("code") or status)
                    raise VideoGenerationError(
                        f"provider_{code.lower()}",
                        str(output.get("message") or f"video task {status.lower()}"),
                    )
                if progress is not None:
                    await progress(clock.percent())
        finally:
            if self._client is None:
                await client.aclose()


def create_dashscope_video_adapter() -> DashScopeVideoAdapter:
    api_key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not api_key:
        raise VideoGenerationError(
            "provider_unconfigured", "DASHSCOPE_API_KEY is required for Wan video"
        )
    return DashScopeVideoAdapter(
        api_key, base_url=os.environ.get("DASHSCOPE_BASE_URL") or None
    )
