"""Agent orchestration route.

POST /api/v1/agents/run   — run a single-turn agent with optional tools

Architecture note:
  Week 1 (now): direct provider.chat() with tool_calls support — structured
  JSON output that the caller can parse and act on. Callers handle tool
  execution themselves (model-in-the-loop pattern).

  Week 3+: replace with LangGraph / CrewAI for multi-turn autonomy. The
  request/response contract is intentionally forward-compatible with that
  migration (tool_calls / tool_results are already in the schema).

This endpoint requires an authenticated organization context because agent
runs are expensive and always metered.
"""

import os
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from _shared.auth import TenantContext, require_organization
from _shared.contracts import UsageEvent
from _shared.usage import dispatch_usage
from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider

router = APIRouter()


class ToolDefinition(BaseModel):
    type: str = "function"
    function: dict[str, Any]


class AgentRunRequest(BaseModel):
    system_prompt: str | None = None
    messages: list[dict[str, Any]] = Field(..., min_length=1)
    tools: list[ToolDefinition] | None = None
    model: str | None = None
    max_tokens: int = Field(default=4096, ge=1, le=32_768)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class AgentRunResponse(BaseModel):
    content: str | None
    tool_calls: list[dict[str, Any]] | None
    finish_reason: str | None
    model: str
    provider: str
    total_tokens: int
    duration_ms: float


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    request: AgentRunRequest,
    tenant: Annotated[TenantContext, Depends(require_organization)],
) -> AgentRunResponse:
    provider = get_default_provider()
    default_model = os.environ.get("DEFAULT_AGENT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

    messages: list[ChatMessage] = []
    if request.system_prompt:
        messages.append(ChatMessage(role="system", content=request.system_prompt))
    for m in request.messages:
        messages.append(ChatMessage(role=m.get("role", "user"), content=m.get("content", "")))

    chat_req = ChatCompletionRequest(
        model=request.model or default_model,
        messages=messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        tools=[t.model_dump() for t in request.tools] if request.tools else None,
    )

    start = time.perf_counter()
    try:
        resp = await provider.chat(chat_req)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"provider error: {exc}") from exc

    duration_ms = (time.perf_counter() - start) * 1000
    total_tokens = resp.usage.get("total_tokens", 0)

    dispatch_usage(
        UsageEvent(
            tenant_id=tenant.organization_id,  # type: ignore[arg-type]
            user_id=tenant.user_id,
            event_name="agent.run",
            provider=provider.name,
            model=resp.model,
            prompt_tokens=resp.usage.get("prompt_tokens", 0),
            completion_tokens=resp.usage.get("completion_tokens", 0),
            total_tokens=total_tokens,
            duration_ms=round(duration_ms, 1),
        )
    )

    return AgentRunResponse(
        content=resp.content,
        tool_calls=resp.tool_calls,
        finish_reason=resp.finish_reason,
        model=resp.model,
        provider=provider.name,
        total_tokens=total_tokens,
        duration_ms=round(duration_ms, 1),
    )
