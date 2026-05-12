"""E2B code execution sandbox route.

POST /api/v1/sandbox/run   — execute code in an isolated E2B sandbox

Security:
  - Requires authenticated service token (organization_id must be present).
  - Enforces per-request timeout via E2B sandbox timeout + asyncio.wait_for.
  - Sandbox is always closed in the finally block to stop E2B billing.
  - Never returns raw exception tracebacks to the caller.

Billing note (see CLAUDE.md pitfall #2):
  - E2B bills by the second; unclosed sandboxes keep accruing cost.
  - Always use AsyncSandbox as an async context manager or explicit close().
"""

import asyncio
import os
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from _shared.auth import TenantContext, require_organization
from _shared.contracts import UsageEvent
from _shared.usage import dispatch_usage

router = APIRouter()

_DEFAULT_TIMEOUT_S = int(os.environ.get("E2B_DEFAULT_TIMEOUT_S", "30"))
_MAX_TIMEOUT_S = int(os.environ.get("E2B_MAX_TIMEOUT_S", "120"))

SupportedLanguage = Literal["python", "javascript", "typescript", "bash", "r"]


class SandboxRunRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=65_536)
    language: SupportedLanguage = "python"
    timeout_s: int = Field(default=_DEFAULT_TIMEOUT_S, ge=1, le=_MAX_TIMEOUT_S)


class SandboxRunResponse(BaseModel):
    stdout: str
    stderr: str
    error: str | None = None
    exit_code: int | None = None
    duration_ms: float


@router.post("/run", response_model=SandboxRunResponse)
async def run_code(
    request: SandboxRunRequest,
    tenant: Annotated[TenantContext, Depends(require_organization)],
) -> SandboxRunResponse:
    """Execute code in an isolated E2B sandbox.

    The sandbox is destroyed immediately after execution regardless of outcome.
    """
    try:
        from e2b_code_interpreter import AsyncSandbox  # noqa: PLC0415
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="sandbox_unavailable: e2b-code-interpreter not installed",
        ) from None

    import time

    start = time.perf_counter()

    try:
        async with AsyncSandbox(timeout=request.timeout_s) as sandbox:
            execution = await asyncio.wait_for(
                sandbox.run_code(request.code, language=request.language),
                timeout=request.timeout_s,
            )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="sandbox_timeout") from None
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"sandbox_error: {type(exc).__name__}"
        ) from None

    duration_ms = (time.perf_counter() - start) * 1000

    error_str: str | None = None
    if execution.error:
        error_str = f"{execution.error.name}: {execution.error.value}"

    dispatch_usage(
        UsageEvent(
            tenant_id=tenant.organization_id,  # type: ignore[arg-type]
            user_id=tenant.user_id,
            event_name="sandbox.run",
            provider="e2b",
            model=request.language,
            duration_ms=round(duration_ms, 1),
        )
    )

    return SandboxRunResponse(
        stdout="\n".join(execution.logs.stdout),
        stderr="\n".join(execution.logs.stderr),
        error=error_str,
        duration_ms=round(duration_ms, 1),
    )
