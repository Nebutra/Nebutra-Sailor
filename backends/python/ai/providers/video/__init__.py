"""Model-democratic video generation seat (PARA `para.generate`, video mode)."""

from providers.video.base import (
    VideoAdapter,
    VideoGenerationError,
    VideoGenerationRequest,
    VideoGenerationResponse,
)
from providers.video.factory import get_video_generator
from providers.video.registry import (
    AUTO,
    MODELS,
    VideoModelSpec,
    auto_model,
    catalogue,
    live_models,
    normalize_request,
    resolve_model,
)

__all__ = [
    "AUTO",
    "MODELS",
    "VideoAdapter",
    "VideoGenerationError",
    "VideoGenerationRequest",
    "VideoGenerationResponse",
    "VideoModelSpec",
    "auto_model",
    "catalogue",
    "get_video_generator",
    "live_models",
    "normalize_request",
    "resolve_model",
]
