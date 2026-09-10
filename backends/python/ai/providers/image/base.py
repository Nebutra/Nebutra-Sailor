"""Image generation provider contract.

Kept deliberately small: prompt + optional reference images in, hosted image URLs
out. Providers must raise ImageGenerationError with a machine-readable `code` — the
task envelope turns it into a terminal error payload (fal-shaped `error_type`, see
docs/product-intelligence/jobs.md).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


class ImageGenerationError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class ImageGenerationRequest:
    prompt: str
    model: str | None = None
    # PARA aspect tokens: "16:9" | "1:1" | "9:16" | "4:3"
    aspect: str = "16:9"
    n: int = 1
    negative_prompt: str | None = None
    # Public URLs of reference images (subjects / source nodes). Non-empty → edit model.
    reference_urls: tuple[str, ...] = field(default_factory=tuple)
    seed: int | None = None


@dataclass(frozen=True)
class ImageGenerationResponse:
    urls: tuple[str, ...]
    model: str
    provider: str
    # Provider-reported usage, passed through for metering.
    usage: dict[str, object] = field(default_factory=dict)


class ImageProvider(Protocol):
    name: str

    async def generate(
        self, request: ImageGenerationRequest
    ) -> ImageGenerationResponse: ...
