"""Pick the adapter that runs a registered video model.

Fails closed: an unknown model, or one whose vendor key is absent, is a typed error —
no toy engine, no silent substitution of a different model than the one asked for.
"""

from __future__ import annotations

from collections.abc import Callable

from providers.video.base import VideoAdapter, VideoGenerationError
from providers.video.dashscope import create_dashscope_video_adapter
from providers.video.registry import VideoModelSpec, resolve_model

# One constructor per vendor. A direct-vendor adapter (Volcengine Ark, Kling, Gemini,
# MiniMax) is added here and pointed at by the model's `vendor` in registry.py.
ADAPTERS: dict[str, Callable[[], VideoAdapter]] = {
    "dashscope": create_dashscope_video_adapter,
}


def get_video_generator(model: str | None) -> tuple[VideoAdapter, VideoModelSpec]:
    spec = resolve_model(model)
    factory = ADAPTERS.get(spec.vendor)
    if factory is None:
        raise VideoGenerationError(
            "provider_unsupported", f"No adapter for vendor '{spec.vendor}'"
        )
    return factory(), spec
