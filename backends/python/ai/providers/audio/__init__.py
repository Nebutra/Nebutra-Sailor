"""Speech synthesis seat (PARA `para.generate`, audio mode).

DashScope Qwen3-TTS-Flash (`qwen3-tts-flash`), non-streaming HTTP. Docs: Bailian
"非实时语音合成(Qwen-TTS)API参考"
(raw/model-api-reference/audio-api-references/speech-synthesis-api-reference/
qwen-tts-api.md, read 2026-09-28):
  POST {base}/api/v1/services/aigc/multimodal-generation/generation
       {"model", "input": {"text", "voice", "language_type"?}}
  → output.audio.url (WAV, valid 24 h), usage.characters
Text limit 600 characters; price 0.8 CNY per 10k characters. Synchronous — no poll.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com"
DEFAULT_TTS_MODEL = "qwen3-tts-flash"
DEFAULT_VOICE = "Cherry"
MAX_TEXT_CHARS = 600
TTS_MODELS = (DEFAULT_TTS_MODEL,)
_VOICE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_\-]{0,63}$")


class SpeechGenerationError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class SpeechRequest:
    text: str
    voice: str = DEFAULT_VOICE
    model: str | None = None
    language_type: str | None = None


@dataclass(frozen=True)
class SpeechResponse:
    url: str
    model: str
    provider: str
    voice: str
    usage: dict[str, object] = field(default_factory=dict)


class DashScopeSpeechProvider:
    name = "dashscope"

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._client = client

    @property
    def endpoint(self) -> str:
        return f"{self._base_url}/api/v1/services/aigc/multimodal-generation/generation"

    def build_body(self, request: SpeechRequest) -> dict[str, Any]:
        text = request.text.strip()
        if not text:
            raise SpeechGenerationError("invalid_prompt", "text is required")
        if len(text) > MAX_TEXT_CHARS:
            raise SpeechGenerationError(
                "invalid_prompt", f"text is limited to {MAX_TEXT_CHARS} characters"
            )
        voice = request.voice or DEFAULT_VOICE
        if not _VOICE_RE.match(voice):
            raise SpeechGenerationError("invalid_voice", f"invalid voice '{voice}'")
        model = request.model or DEFAULT_TTS_MODEL
        if model not in TTS_MODELS:
            raise SpeechGenerationError(
                "unsupported_model", f"Unknown audio model '{model}'"
            )
        input_: dict[str, Any] = {"text": text, "voice": voice}
        if request.language_type:
            input_["language_type"] = request.language_type
        return {"model": model, "input": input_}

    async def synthesize(self, request: SpeechRequest) -> SpeechResponse:
        body = self.build_body(request)
        client = self._client or httpx.AsyncClient(timeout=120.0)
        try:
            response = await client.post(
                self.endpoint,
                json=body,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
            )
        except httpx.TimeoutException as exc:
            raise SpeechGenerationError(
                "provider_timeout", str(exc), retryable=True
            ) from exc
        except httpx.HTTPError as exc:
            raise SpeechGenerationError(
                "provider_unreachable", str(exc), retryable=True
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()
        try:
            payload: dict[str, Any] = response.json()
        except ValueError as exc:
            raise SpeechGenerationError(
                "provider_bad_response", f"non-JSON response ({response.status_code})"
            ) from exc
        if response.status_code >= 400 or payload.get("code"):
            code = str(payload.get("code") or f"http_{response.status_code}")
            raise SpeechGenerationError(
                f"provider_{code.lower()}",
                str(payload.get("message") or response.text[:300]),
                retryable=response.status_code in {429, 500, 502, 503, 504},
            )
        audio = (payload.get("output") or {}).get("audio") or {}
        url = audio.get("url") if isinstance(audio, dict) else None
        if not isinstance(url, str) or not url:
            raise SpeechGenerationError("no_output", "provider returned no audio")
        return SpeechResponse(
            url=url,
            model=str(body["model"]),
            provider=self.name,
            voice=str(body["input"]["voice"]),
            usage=dict(payload.get("usage") or {}),
        )


def get_speech_provider() -> DashScopeSpeechProvider:
    api_key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not api_key:
        raise SpeechGenerationError(
            "provider_unconfigured",
            "DASHSCOPE_API_KEY is required for audio generation",
        )
    return DashScopeSpeechProvider(
        api_key, base_url=os.environ.get("DASHSCOPE_BASE_URL") or None
    )


def speech_live() -> bool:
    return bool(os.environ.get("DASHSCOPE_API_KEY"))
