"""Standard task envelope models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class TaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


TERMINAL_STATUSES = {
    TaskStatus.SUCCEEDED,
    TaskStatus.FAILED,
    TaskStatus.CANCELLED,
}


class TaskCreateRequest(BaseModel):
    type: str = Field(min_length=3, max_length=80, pattern=r"^[a-z][a-z0-9_.-]+$")
    payload: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(
        default=None, min_length=1, max_length=120, pattern=r"^[A-Za-z0-9_.:-]+$"
    )
    queue: str = Field(
        default="ai",
        min_length=1,
        max_length=64,
        pattern=r"^[a-z0-9_-]+$",
    )
    priority: TaskPriority = TaskPriority.NORMAL
    metadata: dict[str, Any] = Field(default_factory=dict)


class TaskEnvelope(BaseModel):
    id: str
    type: str
    status: TaskStatus
    progress: int = Field(ge=0, le=100)
    queue: str
    priority: TaskPriority
    metadata: dict[str, Any]
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    dispatcher_provider: str | None = None
    provider_job_id: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass(frozen=True)
class StoredTask:
    id: str
    tenant_id: str
    user_id: str | None
    type: str
    status: TaskStatus
    progress: int
    queue: str
    priority: TaskPriority
    payload: dict[str, Any]
    metadata: dict[str, Any]
    result: dict[str, Any] | None
    error: dict[str, Any] | None
    idempotency_key: str | None
    dispatcher_provider: str | None
    provider_job_id: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    def envelope(self) -> TaskEnvelope:
        return TaskEnvelope(
            id=self.id,
            type=self.type,
            status=self.status,
            progress=self.progress,
            queue=self.queue,
            priority=self.priority,
            metadata=self.metadata,
            result=self.result,
            error=self.error,
            dispatcher_provider=self.dispatcher_provider,
            provider_job_id=self.provider_job_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
            started_at=self.started_at,
            completed_at=self.completed_at,
        )


def utcnow() -> datetime:
    return datetime.now(UTC)
