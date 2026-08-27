"""Cross-language event contracts for the Nebutra backend fleet.

This file is the Python source of truth for events that cross service
boundaries (python/ai → go/event-ingest → ClickHouse).

SYNC RULE: Every field here must be mirrored in:
  - backends/_shared/contracts/events.ts  (TypeScript / gateway)
  - backends/go/_shared/contracts/events.go (Go / event-ingest)
  - Semver the contract_version field when shapes change.

Event name taxonomy:  <domain>.<action>
  llm.completion      Non-streaming chat completion
  llm.stream          Streaming chat completion (token count estimated)
  embedding.create    Embedding generation
  sandbox.run         E2B code execution
  agent.run           Agent invocation
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class UsageEvent(BaseModel):
    """Usage event dispatched fire-and-forget after every AI operation.

    Consumed by go/event-ingest which writes to ClickHouse events_bronze.
    The gateway's usageMeteringMiddleware also reads X-Tokens-Used response
    header for real-time Redis counters — both paths are complementary.
    """

    model_config = {"frozen": True}

    # Identity
    tenant_id: str
    user_id: str | None = None
    request_id: str | None = None
    trace_id: str | None = None

    # Event classification
    event_name: str  # e.g. "llm.completion"
    source: str = "python-ai"
    contract_version: str = "v1"

    # AI-specific payload
    provider: str  # "siliconflow" | "openai" | "openrouter"
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    duration_ms: float = 0.0

    # Timing
    occurred_at: str = Field(default_factory=_now_iso)
