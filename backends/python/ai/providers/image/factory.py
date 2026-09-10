"""Select the image generation provider.

Fails closed: no toy engine, no silent fallback.
"""

from __future__ import annotations

import os

from providers.image.base import ImageGenerationError, ImageProvider
from providers.image.dashscope import create_dashscope_image_provider

SUPPORTED = ("dashscope",)


def get_image_provider() -> ImageProvider:
    provider = (os.environ.get("IMAGE_PROVIDER") or "").lower()
    if not provider:
        provider = "dashscope" if os.environ.get("DASHSCOPE_API_KEY") else ""
    if provider == "dashscope":
        return create_dashscope_image_provider()
    if not provider:
        raise ImageGenerationError(
            "provider_unconfigured",
            "No image provider configured (set IMAGE_PROVIDER or DASHSCOPE_API_KEY)",
        )
    raise ImageGenerationError(
        "provider_unsupported",
        f"Unsupported IMAGE_PROVIDER: {provider} (supported: {SUPPORTED})",
    )
