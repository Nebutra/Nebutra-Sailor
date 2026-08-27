"""Text embedding routes.

POST /api/v1/embed/    — single or batch embedding

Uses the multi-provider factory. Dispatches a UsageEvent fire-and-forget.
"""

import os
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from _shared.auth import TenantContext, get_tenant
from _shared.contracts import UsageEvent
from _shared.usage import dispatch_usage
from providers.base import EmbeddingRequest
from providers.factory import get_default_provider

router = APIRouter()


class EmbedRequest(BaseModel):
    input: str | list[str]
    model: str | None = None  # None → provider default


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    provider: str
    dimensions: int
    total_tokens: int
    duration_ms: float


@router.post("/", response_model=EmbedResponse)
async def embed(
    request: EmbedRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    http_request: Request,
) -> EmbedResponse:
    provider = get_default_provider()
    default_model = os.environ.get("DEFAULT_EMBEDDING_MODEL", "BAAI/bge-m3")

    embed_req = EmbeddingRequest(
        model=request.model or default_model,
        input=request.input,
    )

    start = time.perf_counter()
    try:
        resp = await provider.embed(embed_req)
    except NotImplementedError:
        raise HTTPException(
            status_code=422,
            detail=f"Provider '{provider.name}' does not support embeddings",
        ) from None
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"provider error: {exc}") from exc

    duration_ms = (time.perf_counter() - start) * 1000
    total_tokens = resp.usage.get("total_tokens", 0)
    dims = len(resp.embeddings[0]) if resp.embeddings else 0

    if tenant.organization_id:
        dispatch_usage(
            UsageEvent(
                tenant_id=tenant.organization_id,
                user_id=tenant.user_id,
                request_id=http_request.headers.get("x-request-id"),
                trace_id=http_request.headers.get("x-trace-id"),
                event_name="embedding.create",
                provider=provider.name,
                model=resp.model,
                total_tokens=total_tokens,
                duration_ms=round(duration_ms, 1),
            )
        )

    return EmbedResponse(
        embeddings=resp.embeddings,
        model=resp.model,
        provider=provider.name,
        dimensions=dims,
        total_tokens=total_tokens,
        duration_ms=round(duration_ms, 1),
    )
