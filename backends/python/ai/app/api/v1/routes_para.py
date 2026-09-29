"""PARA model catalogue — which generation models this origin can run right now.

GET /api/v1/para/models
  {"modes": {
     "image": {"auto": "qwen-image-2.0" | null, "models": [Model]},
     "video": {"auto": "wan-2.7" | null,        "models": [Model]},
     "audio": {"auto": "qwen3-tts-flash" | null, "models": [Model]},
     "text":  {"auto": "default" | null,        "models": [Model]}}}
  Model = {id, label, vendor, status: "available" | "planned", live: bool,
           capabilities: {...}}
Live models are those whose vendor key is in this process's env. Planned video models
are listed with live=false so the canvas can show them as coming soon. Prices are not
here: the gateway adds them from @nebutra/billing/prices, the table it charges from.
"""

from __future__ import annotations

import os
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from _shared.auth import TenantContext, require_organization
from providers.audio import DEFAULT_TTS_MODEL, speech_live
from providers.video import catalogue as video_catalogue

router = APIRouter()
ParaTenant = Annotated[TenantContext, Depends(require_organization)]


def _image_section() -> dict[str, Any]:
    live = bool(os.environ.get("DASHSCOPE_API_KEY")) and (
        (os.environ.get("IMAGE_PROVIDER") or "dashscope").lower() == "dashscope"
    )
    models = (
        [
            {
                "id": "qwen-image-2.0",
                "label": "Qwen Image 2.0",
                "vendor": "dashscope",
                "status": "available",
                "live": True,
                "capabilities": {
                    "textToImage": True,
                    "imageEdit": True,
                    "counts": [1, 2, 4],
                    "aspects": ["16:9", "9:16", "1:1", "4:3"],
                },
            }
        ]
        if live
        else []
    )
    return {"auto": "qwen-image-2.0" if live else None, "models": models}


def _audio_section() -> dict[str, Any]:
    live = speech_live()
    models = (
        [
            {
                "id": DEFAULT_TTS_MODEL,
                "label": "Qwen3 TTS Flash",
                "vendor": "dashscope",
                "status": "available",
                "live": True,
                "capabilities": {"maxChars": 600, "defaultVoice": "Cherry"},
            }
        ]
        if live
        else []
    )
    return {"auto": DEFAULT_TTS_MODEL if live else None, "models": models}


def _text_section() -> dict[str, Any]:
    return {
        "auto": "default",
        "models": [
            {
                "id": "default",
                "label": "Default",
                "vendor": os.environ.get("DEFAULT_AI_PROVIDER") or "siliconflow",
                "status": "available",
                "live": True,
                "capabilities": {},
            }
        ],
    }


def para_catalogue() -> dict[str, Any]:
    return {
        "modes": {
            "image": _image_section(),
            "video": video_catalogue(),
            "audio": _audio_section(),
            "text": _text_section(),
        }
    }


@router.get("/models")
async def list_models(_tenant: ParaTenant) -> dict[str, Any]:
    return para_catalogue()
