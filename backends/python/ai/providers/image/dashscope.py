"""DashScope (Alibaba Cloud Bailian) image generation — Qwen-Image family.

Endpoint:
  POST {DASHSCOPE_BASE_URL}/api/v1/services/aigc/multimodal-generation/generation
Text-to-image: qwen-image-2.0 (default). With references: qwen-image-edit-plus.
Response: output.choices[*].message.content[*].image → a temporary hosted URL,
persisted by the caller.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from providers.image.base import (
    ImageGenerationError,
    ImageGenerationRequest,
    ImageGenerationResponse,
)

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com"
DEFAULT_T2I_MODEL = "qwen-image-2.0"
DEFAULT_EDIT_MODEL = "qwen-image-edit-plus"

# PARA aspect → DashScope size. Qwen-Image accepts width*height strings.
SIZE_BY_ASPECT: dict[str, str] = {
    "16:9": "1664*928",
    "9:16": "928*1664",
    "1:1": "1328*1328",
    "4:3": "1472*1104",
}


class DashScopeImageProvider:
    name = "dashscope"

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout_seconds: float = 120.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._timeout = timeout_seconds
        self._client = client

    @property
    def endpoint(self) -> str:
        return f"{self._base_url}/api/v1/services/aigc/multimodal-generation/generation"

    def build_body(self, request: ImageGenerationRequest) -> dict[str, Any]:
        content: list[dict[str, str]] = [
            {"image": url} for url in request.reference_urls
        ]
        content.append({"text": request.prompt})
        model = request.model or (
            DEFAULT_EDIT_MODEL if request.reference_urls else DEFAULT_T2I_MODEL
        )
        parameters: dict[str, Any] = {
            "n": max(1, min(4, request.n)),
            "size": SIZE_BY_ASPECT.get(request.aspect, SIZE_BY_ASPECT["16:9"]),
            "watermark": False,
        }
        if request.negative_prompt:
            parameters["negative_prompt"] = request.negative_prompt
        if request.seed is not None:
            parameters["seed"] = request.seed
        return {
            "model": model,
            "input": {"messages": [{"role": "user", "content": content}]},
            "parameters": parameters,
        }

    async def generate(
        self, request: ImageGenerationRequest
    ) -> ImageGenerationResponse:
        if not request.prompt.strip():
            raise ImageGenerationError("invalid_prompt", "prompt is required")
        body = self.build_body(request)
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        client = self._client or httpx.AsyncClient(timeout=self._timeout)
        try:
            response = await client.post(self.endpoint, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise ImageGenerationError(
                "provider_timeout", str(exc), retryable=True
            ) from exc
        except httpx.HTTPError as exc:
            raise ImageGenerationError(
                "provider_unreachable", str(exc), retryable=True
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

        payload: dict[str, Any]
        try:
            payload = response.json()
        except ValueError as exc:
            raise ImageGenerationError(
                "provider_bad_response", f"non-JSON response ({response.status_code})"
            ) from exc

        if response.status_code >= 400 or payload.get("code"):
            code = str(payload.get("code") or f"http_{response.status_code}")
            message = str(payload.get("message") or response.text[:300])
            retryable = response.status_code in {429, 500, 502, 503, 504}
            raise ImageGenerationError(
                f"provider_{code.lower()}", message, retryable=retryable
            )

        urls: list[str] = []
        for choice in (payload.get("output") or {}).get("choices") or []:
            for part in ((choice.get("message") or {}).get("content")) or []:
                url = part.get("image") if isinstance(part, dict) else None
                if isinstance(url, str) and url:
                    urls.append(url)
        if not urls:
            raise ImageGenerationError("no_output", "provider returned no image")

        return ImageGenerationResponse(
            urls=tuple(urls),
            model=str(body["model"]),
            provider=self.name,
            usage=dict(payload.get("usage") or {}),
        )


def create_dashscope_image_provider() -> DashScopeImageProvider:
    api_key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not api_key:
        raise ImageGenerationError(
            "provider_unconfigured",
            "DASHSCOPE_API_KEY is required for image generation",
        )
    return DashScopeImageProvider(
        api_key, base_url=os.environ.get("DASHSCOPE_BASE_URL") or None
    )
