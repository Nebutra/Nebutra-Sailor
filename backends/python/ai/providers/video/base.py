"""Video generation contract — vendor-neutral.

Prompt + optional first-frame reference in, one hosted video URL out. Every video
vendor we use is asynchronous, so an adapter owns its submit → poll loop, reports
progress through a callback and gives up after a bounded total wait. Adapters raise
VideoGenerationError with a machine-readable `code`; the task envelope turns it into a
terminal error payload (fal-shaped `error_type`, docs/product-intelligence/jobs.md).

Which models exist, what each one accepts and which vendor serves it lives in
registry.py; adapters only speak their vendor's wire protocol.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from providers.video.registry import VideoModelSpec

ProgressFn = Callable[[int], Awaitable[None]]

# How long a single clip may take end to end before we stop polling and fail the task.
# Vendors quote 1-5 minutes; queues add to that. The Celery hard limit on the task
# (app/workers/task_envelope.py) sits above this so the typed timeout wins.
DEFAULT_MAX_WAIT_SECONDS = 20 * 60
DEFAULT_POLL_INTERVAL_SECONDS = 10.0


def max_wait_seconds() -> float:
    raw = os.environ.get("PARA_VIDEO_MAX_WAIT_SECONDS")
    try:
        return float(raw) if raw else float(DEFAULT_MAX_WAIT_SECONDS)
    except ValueError:
        return float(DEFAULT_MAX_WAIT_SECONDS)


class VideoGenerationError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class VideoGenerationRequest:
    """A request already normalized against its model (registry.normalize_request)."""

    prompt: str
    aspect: str = "16:9"
    # PARA resolution tier: "480P" | "720P" | "1080P".
    resolution: str = "720P"
    duration_seconds: int = 5
    negative_prompt: str | None = None
    # Public URL of the first frame. Set → image-to-video; unset → text-to-video.
    first_frame_url: str | None = None
    seed: int | None = None


@dataclass(frozen=True)
class VideoGenerationResponse:
    url: str
    model: str
    provider: str
    duration_seconds: int
    # The vendor's own model / endpoint id that ran.
    vendor_model: str = ""
    usage: dict[str, object] = field(default_factory=dict)
    provider_task_id: str | None = None


class VideoAdapter(Protocol):
    """One vendor's wire protocol. Stateless apart from credentials."""

    vendor: str

    async def generate(
        self,
        spec: VideoModelSpec,
        request: VideoGenerationRequest,
        progress: ProgressFn | None = None,
    ) -> VideoGenerationResponse: ...


class PollClock:
    """Bounded wait with a synthetic progress ramp.

    Vendors report status, not percentages, so progress is time-based: it climbs
    toward `ceiling` over the expected run time and never reaches it until done.
    """

    def __init__(
        self,
        *,
        max_wait: float,
        interval: float,
        expected: float = 180.0,
        floor: int = 15,
        ceiling: int = 85,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max_wait = max_wait
        self._interval = interval
        self._expected = max(1.0, expected)
        self._floor = floor
        self._ceiling = ceiling
        self._sleep = sleep
        self._now = now
        self._started = now()

    @property
    def elapsed(self) -> float:
        return self._now() - self._started

    def expired(self) -> bool:
        return self.elapsed >= self._max_wait

    def percent(self) -> int:
        share = min(1.0, self.elapsed / self._expected)
        return self._floor + int((self._ceiling - self._floor) * share)

    async def tick(self) -> None:
        await self._sleep(self._interval)
