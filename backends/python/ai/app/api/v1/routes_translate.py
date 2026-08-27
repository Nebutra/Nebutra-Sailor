"""Text translation route.

POST /api/v1/translate/   — translate text between languages

Uses the multi-provider factory (translation is a prompt, not a special API).
"""

import os
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from _shared.auth import TenantContext, get_tenant
from _shared.contracts import UsageEvent
from _shared.usage import dispatch_usage
from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider

router = APIRouter()

_LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "ar": "Arabic",
    "ru": "Russian",
}


class TranslateRequest(BaseModel):
    text: str
    source: str = "en"
    target: str = "zh"
    model: str | None = None


class TranslateResponse(BaseModel):
    translated_text: str
    source: str
    target: str
    model: str
    provider: str
    total_tokens: int
    duration_ms: float


@router.post("/", response_model=TranslateResponse)
async def translate(
    request: TranslateRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    http_request: Request,
) -> TranslateResponse:
    source_lang = _LANGUAGE_NAMES.get(request.source, request.source)
    target_lang = _LANGUAGE_NAMES.get(request.target, request.target)

    prompt = (
        f"Translate the following text from {source_lang} to {target_lang}. "
        f"Output only the translation, nothing else.\n\n{request.text}"
    )

    provider = get_default_provider()
    default_model = os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

    chat_req = ChatCompletionRequest(
        model=request.model or default_model,
        messages=[ChatMessage(role="user", content=prompt)],
        temperature=0.2,
        max_tokens=4096,
    )

    start = time.perf_counter()
    try:
        resp = await provider.chat(chat_req)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"provider error: {exc}") from exc

    duration_ms = (time.perf_counter() - start) * 1000
    total_tokens = resp.usage.get("total_tokens", 0)

    if tenant.organization_id:
        dispatch_usage(
            UsageEvent(
                tenant_id=tenant.organization_id,
                user_id=tenant.user_id,
                request_id=http_request.headers.get("x-request-id"),
                trace_id=http_request.headers.get("x-trace-id"),
                event_name="llm.completion",
                provider=provider.name,
                model=resp.model,
                prompt_tokens=resp.usage.get("prompt_tokens", 0),
                completion_tokens=resp.usage.get("completion_tokens", 0),
                total_tokens=total_tokens,
                duration_ms=round(duration_ms, 1),
            )
        )

    return TranslateResponse(
        translated_text=(resp.content or "").strip(),
        source=request.source,
        target=request.target,
        model=resp.model,
        provider=provider.name,
        total_tokens=total_tokens,
        duration_ms=round(duration_ms, 1),
    )
