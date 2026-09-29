"""PARA's video model registry — model-democratic, keyed by PARA model id.

Callers pick a PARA id ("wan-2.7", "seedance-2.5") or "Auto"; the registry decides which
vendor adapter runs it and with which vendor model id. Adding a vendor is one adapter in
factory.py plus pointing entries here at it — callers never change.

Two kinds of entry:
- `available`: an adapter exists. Live only when its vendor key is in the env — keys
  decide what is live. Available-but-keyless models are not listed at all.
- `planned`: shown in the model list as coming soon (live=false) so the canvas can say
  so, never runnable. No adapter, no price. The gateway refuses them before charging.

Capabilities mirror the price table in packages/commerce/billing/src/prices/index.ts
(`PARA_VIDEO_MODELS`): the gateway charges from that table, the origin generates from
this one, and tests/test_para_video.py fails when they disagree. Change them together.

Wan 2.7 (available, DashScope): Bailian docs "万相2.7-文生视频/图生视频API参考",
read 2026-09-28 — see dashscope.py. t2v resolution 720P|1080P, ratio
16:9|9:16|1:1|4:3|3:4, duration 2-15 s; i2v first frame, ratio follows the frame.
List price 0.6 CNY/s 720P, 1.0 CNY/s 1080P.

Planned entries — capabilities from public model pages (fal.ai model pages, glanced
2026-09-28), NOT verified against a vendor API; re-check when an adapter lands:
- Seedance 2.5 (ByteDance): t2v + first frame, 4-30 s, 480p/720p.
- Kling 3.0 Pro (Kuaishou): t2v + first frame, 3-15 s, 16:9|9:16|1:1.
- Veo 3.1 (Google): t2v + first frame, 4/6/8 s, 720p/1080p, 16:9|9:16.
- MiniMax H3 (Hailuo line; the owner's "Minimax-H3"): t2v + first frame, 5-15 s,
  480P/768P/1080P.
"""

from __future__ import annotations

import math
import os
from collections.abc import Mapping

from providers.video.base import (
    VideoGenerationError,
    VideoGenerationRequest,
    VideoModelSpec,
)

AUTO = "Auto"
RESOLUTION_TIERS = ("480P", "720P", "1080P")

# Env var whose presence makes a vendor's adapter live.
VENDOR_KEYS: dict[str, str] = {
    "dashscope": "DASHSCOPE_API_KEY",
}


def _span(lo: int, hi: int) -> tuple[int, ...]:
    return tuple(range(lo, hi + 1))


MODELS: tuple[VideoModelSpec, ...] = (
    VideoModelSpec(
        id="wan-2.7",
        label="Wan 2.7",
        vendor="dashscope",
        status="available",
        t2v_model="wan2.7-t2v",
        i2v_model="wan2.7-i2v",
        durations=_span(2, 15),
        default_duration=5,
        resolutions=("720P", "1080P"),
        default_resolution="720P",
        aspects=("16:9", "9:16", "1:1", "4:3"),
    ),
    VideoModelSpec(
        id="seedance-2.5",
        label="Seedance 2.5",
        vendor="bytedance",
        status="planned",
        durations=_span(4, 30),
        default_duration=5,
        resolutions=("480P", "720P"),
        default_resolution="720P",
        aspects=("16:9", "9:16", "1:1", "4:3"),
    ),
    VideoModelSpec(
        id="kling-3",
        label="Kling 3.0",
        vendor="kuaishou",
        status="planned",
        durations=_span(3, 15),
        default_duration=5,
        resolutions=("1080P",),
        default_resolution="1080P",
        aspects=("16:9", "9:16", "1:1"),
    ),
    VideoModelSpec(
        id="veo-3.1",
        label="Veo 3.1",
        vendor="google",
        status="planned",
        durations=(4, 6, 8),
        default_duration=6,
        resolutions=("720P", "1080P"),
        default_resolution="720P",
        aspects=("16:9", "9:16"),
    ),
    VideoModelSpec(
        id="minimax-h3",
        label="MiniMax H3",
        vendor="minimax",
        status="planned",
        durations=_span(5, 15),
        default_duration=5,
        resolutions=("480P", "720P", "1080P"),
        default_resolution="720P",
        aspects=("16:9", "9:16", "1:1", "4:3"),
        resolution_names=(("720P", "768P"),),
    ),
)

# "Auto" = the first live model in this order. Only Wan can be live today, so Auto is
# Wan; the others slot in ahead of it as their adapters land. Keep in step with
# PARA_VIDEO_AUTO_ORDER in @nebutra/billing/prices (the gateway resolves Auto there
# before charging).
AUTO_PREFERENCE: tuple[str, ...] = (
    "seedance-2.5",
    "kling-3",
    "veo-3.1",
    "minimax-h3",
    "wan-2.7",
)

_BY_ID = {spec.id: spec for spec in MODELS}


def _env(env: Mapping[str, str] | None) -> Mapping[str, str]:
    return os.environ if env is None else env


def is_live(spec: VideoModelSpec, env: Mapping[str, str] | None = None) -> bool:
    key = VENDOR_KEYS.get(spec.vendor)
    return spec.status == "available" and bool(key and _env(env).get(key))


def live_models(env: Mapping[str, str] | None = None) -> list[VideoModelSpec]:
    return [spec for spec in MODELS if is_live(spec, env)]


def auto_model(env: Mapping[str, str] | None = None) -> VideoModelSpec | None:
    live = {spec.id for spec in live_models(env)}
    for model_id in AUTO_PREFERENCE:
        if model_id in live:
            return _BY_ID[model_id]
    return None


def resolve_model(
    model: str | None, env: Mapping[str, str] | None = None
) -> VideoModelSpec:
    """The spec that will run `model`. Fails closed with a typed error otherwise."""
    if model in (None, "", AUTO):
        spec = auto_model(env)
        if spec is None:
            raise VideoGenerationError(
                "provider_unconfigured",
                "No video model is configured (set DASHSCOPE_API_KEY)",
            )
        return spec
    spec = _BY_ID.get(str(model))
    if spec is None:
        raise VideoGenerationError(
            "unsupported_model",
            f"Unknown video model '{model}' (known: {', '.join(_BY_ID)})",
        )
    if spec.status != "available":
        raise VideoGenerationError(
            "model_unavailable", f"Video model '{spec.id}' is not available yet"
        )
    if not is_live(spec, env):
        raise VideoGenerationError(
            "provider_unconfigured",
            f"Video model '{spec.id}' needs {VENDOR_KEYS.get(spec.vendor, 'a key')}",
        )
    return spec


def snap_duration(spec: VideoModelSpec, value: object) -> int:
    """Nearest allowed whole second, ties up; unreadable → the model default.

    Accepts 5, 5.0, "5" and "5s" — the canvas stores durations as either.
    """
    seconds: float | None = None
    if isinstance(value, int | float) and not isinstance(value, bool):
        seconds = float(value)
    elif isinstance(value, str):
        try:
            seconds = float(value.strip().lower().removesuffix("s").strip())
        except ValueError:
            seconds = None
    if seconds is None or not math.isfinite(seconds):
        return spec.default_duration
    target = seconds
    return min(spec.durations, key=lambda d: (abs(d - target), -d))


def normalize_resolution(spec: VideoModelSpec, value: object) -> str:
    text = str(value or "").strip().upper()
    if text and not text.endswith("P"):
        text = f"{text}P"
    return text if text in spec.resolutions else spec.default_resolution


def normalize_aspect(spec: VideoModelSpec, value: object) -> str:
    text = str(value or "").strip()
    return text if text in spec.aspects else spec.aspects[0]


def _seed(value: object) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        return None


def normalize_request(
    spec: VideoModelSpec,
    *,
    prompt: str,
    params: Mapping[str, object],
    first_frame_url: str | None,
) -> VideoGenerationRequest:
    negative = params.get("negative_prompt")
    return VideoGenerationRequest(
        prompt=prompt,
        aspect=normalize_aspect(spec, params.get("aspect") or params.get("ratio")),
        resolution=normalize_resolution(spec, params.get("resolution")),
        duration_seconds=snap_duration(spec, params.get("duration")),
        negative_prompt=str(negative) if negative else None,
        first_frame_url=first_frame_url,
        seed=_seed(params.get("seed")),
    )


def catalogue(env: Mapping[str, str] | None = None) -> dict[str, object]:
    """The model list's video section: live models, then planned ones (coming soon)."""
    auto = auto_model(env)
    entries = [spec for spec in MODELS if is_live(spec, env)] + [
        spec for spec in MODELS if spec.status == "planned"
    ]
    return {
        "auto": auto.id if auto else None,
        "models": [
            {
                "id": spec.id,
                "label": spec.label,
                "vendor": spec.vendor,
                "status": spec.status,
                "live": is_live(spec, env),
                "capabilities": spec.capabilities(),
            }
            for spec in entries
        ],
    }
