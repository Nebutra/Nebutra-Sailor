"""LLM text generation routes.

POST /api/v1/generate/          — non-streaming completion
POST /api/v1/generate/stream    — SSE streaming completion

Both endpoints:
  - Use the multi-provider factory (SiliconFlow / OpenAI / OpenRouter)
  - Require a valid x-service-token from the gateway
  - Dispatch a UsageEvent fire-and-forget after each completion
  - Set X-Tokens-Used response header (consumed by gateway usageMeteringMiddleware)
"""

import json
import os
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from _shared.auth import TenantContext, get_tenant
from _shared.contracts import UsageEvent
from _shared.usage import dispatch_usage
from providers.factory import get_default_provider
from providers.base import ChatCompletionRequest, ChatMessage

router = APIRouter()


# ── Request / Response models ─────────────────────────────────────────────────


class Message(BaseModel):
    role: str = "user"
    content: str


class GenerateRequest(BaseModel):
    messages: list[Message] | None = None
    prompt: str | None = None  # convenience alias — wraps in a single user message
    model: str | None = None  # None → provider's default model
    max_tokens: int = Field(default=2048, ge=1, le=32_768)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    stream: bool = False

    def to_messages(self) -> list[Message]:
        if self.messages:
            return self.messages
        if self.prompt:
            return [Message(role="user", content=self.prompt)]
        raise ValueError("Either 'messages' or 'prompt' is required")


class GenerateResponse(BaseModel):
    text: str
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    duration_ms: float


# ── Shared helper ─────────────────────────────────────────────────────────────


def _build_chat_request(req: GenerateRequest, provider_default_model: str) -> ChatCompletionRequest:
    return ChatCompletionRequest(
        model=req.model or provider_default_model,
        messages=[
            ChatMessage(role=m.role, content=m.content)
            for m in req.to_messages()
        ],
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        stream=req.stream,
    )


# ── Non-streaming ─────────────────────────────────────────────────────────────


@router.post("/", response_model=GenerateResponse)
async def generate(
    request: GenerateRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    http_request: Request,
) -> GenerateResponse:
    provider = get_default_provider()

    # Default model per provider (providers expose get_available_models but the
    # first model listed is not necessarily the right default; use env override).
    default_model = os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

    try:
        chat_req = _build_chat_request(request, default_model)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    start = time.perf_counter()
    try:
        resp = await provider.chat(chat_req)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"provider error: {exc}") from exc

    duration_ms = (time.perf_counter() - start) * 1000

    _dispatch(
        tenant=tenant,
        http_request=http_request,
        event_name="llm.completion",
        provider=provider.name,
        model=resp.model,
        prompt_tokens=resp.usage.get("prompt_tokens", 0),
        completion_tokens=resp.usage.get("completion_tokens", 0),
        total_tokens=resp.usage.get("total_tokens", 0),
        duration_ms=duration_ms,
    )

    result = GenerateResponse(
        text=resp.content or "",
        model=resp.model,
        provider=provider.name,
        prompt_tokens=resp.usage.get("prompt_tokens", 0),
        completion_tokens=resp.usage.get("completion_tokens", 0),
        total_tokens=resp.usage.get("total_tokens", 0),
        duration_ms=round(duration_ms, 1),
    )
    return result


# ── SSE streaming ─────────────────────────────────────────────────────────────


@router.post("/stream")
async def generate_stream(
    request: GenerateRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    http_request: Request,
) -> StreamingResponse:
    """Server-Sent Events streaming endpoint.

    Each event:
        data: {"delta": "<chunk>", "done": false}\n\n

    Final event:
        data: {"delta": "", "done": true, "total_tokens": <n>}\n\n

    The gateway's usageMeteringMiddleware cannot read X-Tokens-Used for
    streaming responses (header is set before the body). Token metering
    for streaming calls is handled exclusively via the UsageEvent queue.
    """
    provider = get_default_provider()
    default_model = os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

    try:
        chat_req = _build_chat_request(request, default_model)
        chat_req = ChatCompletionRequest(
            model=chat_req.model,
            messages=chat_req.messages,
            temperature=chat_req.temperature,
            max_tokens=chat_req.max_tokens,
            stream=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    start = time.perf_counter()
    token_estimate = 0

    async def event_stream():
        nonlocal token_estimate
        full_text = ""

        try:
            async for chunk in provider.chat_stream(chat_req):
                full_text += chunk
                # Rough token estimate: 1 token ≈ 4 chars (good enough for metering)
                token_estimate += max(1, len(chunk) // 4)
                yield f"data: {json.dumps({'delta': chunk, 'done': False})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc), 'done': True})}\n\n"
            return

        duration_ms = (time.perf_counter() - start) * 1000
        yield f"data: {json.dumps({'delta': '', 'done': True, 'total_tokens': token_estimate})}\n\n"

        _dispatch(
            tenant=tenant,
            http_request=http_request,
            event_name="llm.stream",
            provider=provider.name,
            model=chat_req.model,
            prompt_tokens=0,  # not available from stream
            completion_tokens=token_estimate,
            total_tokens=token_estimate,
            duration_ms=duration_ms,
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering
        },
    )


# ── Usage dispatch helper ─────────────────────────────────────────────────────


def _dispatch(
    *,
    tenant: TenantContext,
    http_request: Request,
    event_name: str,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    duration_ms: float,
) -> None:
    if not tenant.organization_id:
        return  # skip metering for anonymous/health requests

    dispatch_usage(
        UsageEvent(
            tenant_id=tenant.organization_id,
            user_id=tenant.user_id,
            request_id=http_request.headers.get("x-request-id"),
            trace_id=http_request.headers.get("x-trace-id"),
            event_name=event_name,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            duration_ms=round(duration_ms, 1),
        )
    )
