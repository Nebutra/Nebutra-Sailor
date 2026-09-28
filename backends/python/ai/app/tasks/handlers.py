"""Task-type handlers for the standard task envelope.

Each handler takes the stored task plus a progress callback and returns the result
dict. Raise TaskFailureError for a typed, terminal failure; anything else becomes
`task_handler_failed`.
"""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from typing import Any

from app.tasks.models import StoredTask
from app.uploads.persist import PersistError, persist_from_url
from app.uploads.store import sanitize_filename
from providers.audio import (
    SpeechGenerationError,
    SpeechRequest,
    get_speech_provider,
)
from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider
from providers.image import (
    ImageGenerationError,
    ImageGenerationRequest,
    get_image_provider,
)
from providers.video import (
    VideoGenerationError,
    get_video_generator,
    normalize_request,
)

ProgressFn = Callable[[int], Awaitable[None]]


class TaskFailureError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable

    def as_error(self) -> dict[str, Any]:
        return {"code": self.code, "message": str(self), "retryable": self.retryable}


# ── llm.generate ──────────────────────────────────────────────────────────────


async def handle_llm_generate(task: StoredTask, progress: ProgressFn) -> dict[str, Any]:
    return await _llm_generate(task.payload)


async def _llm_generate(payload: dict[str, Any]) -> dict[str, Any]:
    provider = get_default_provider()
    messages = payload.get("messages")
    prompt = payload.get("prompt")
    if messages:
        chat_messages = [
            ChatMessage(role=item.get("role", "user"), content=item["content"])
            for item in messages
        ]
    elif prompt:
        chat_messages = [ChatMessage(role="user", content=prompt)]
    else:
        raise TaskFailureError(
            "invalid_payload", "Either messages or prompt is required"
        )

    chat_request = ChatCompletionRequest(
        model=payload.get("model")
        or os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct"),
        messages=chat_messages,
        temperature=float(payload.get("temperature", 0.7)),
        max_tokens=int(payload.get("max_tokens", 2048)),
        stream=False,
    )
    response = await provider.chat(chat_request)
    return {
        "text": response.content or "",
        "model": response.model,
        "provider": provider.name,
        "usage": response.usage,
    }


# ── para.generate ─────────────────────────────────────────────────────────────
# Payload (from backends/gateway routes/para):
#   {workspaceId, nodeId, generator: {mode, model?, prompt?,
#    params?: {aspect?|ratio?, resolution?, duration?, negative_prompt?, seed?, voice?},
#    references?: [{kind, id, url?}], count?}}
# Result, image / video / audio mode:
#   {"mode", "assets": [{url, key, contentType, size}], "model", "provider", "usage"}
#   video usage carries {"seconds": n}; audio carries the provider's character count.
# Result, text mode:  {"text", ...}


def _reference_urls(generator: dict[str, Any]) -> tuple[str, ...]:
    return tuple(
        str(ref["url"])
        for ref in (generator.get("references") or [])
        if isinstance(ref, dict) and ref.get("url")
    )


def _asset_key(task: StoredTask, workspace_id: str, node_id: str, name: str) -> str:
    return (
        f"para/{sanitize_filename(task.tenant_id)}/{sanitize_filename(workspace_id)}/"
        f"{sanitize_filename(node_id)}/{task.id}-{name}"
    )


async def _persist(url: str, key: str, content_type: str) -> dict[str, Any]:
    try:
        persisted = await persist_from_url(url, key, content_type=content_type)
    except PersistError as exc:
        raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc
    return {
        "url": persisted.url,
        "key": persisted.key,
        "contentType": persisted.content_type,
        "size": persisted.size,
    }


async def _para_video(
    task: StoredTask,
    progress: ProgressFn,
    generator: dict[str, Any],
    workspace_id: str,
    node_id: str,
) -> dict[str, Any]:
    prompt = str(generator.get("prompt") or "").strip()
    references = _reference_urls(generator)
    if not prompt and not references:
        raise TaskFailureError(
            "invalid_payload", "prompt or a first-frame reference is required for video"
        )
    try:
        adapter, spec = get_video_generator(
            None if generator.get("model") in (None, "") else str(generator["model"])
        )
    except VideoGenerationError as exc:
        raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc

    request = normalize_request(
        spec,
        prompt=prompt,
        params=generator.get("params") or {},
        # The first reference is the first frame; the rest are not used by video yet.
        first_frame_url=references[0] if references else None,
    )
    await progress(5)
    try:
        generated = await adapter.generate(spec, request, progress)
    except VideoGenerationError as exc:
        raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc
    await progress(90)
    asset = await _persist(
        generated.url, _asset_key(task, workspace_id, node_id, "1.mp4"), "video/mp4"
    )
    return {
        "mode": "video",
        "assets": [asset],
        "model": generated.model,
        "vendorModel": generated.vendor_model,
        "provider": generated.provider,
        "usage": {**generated.usage, "seconds": generated.duration_seconds},
        "params": {
            "duration": request.duration_seconds,
            "resolution": request.resolution,
            "aspect": request.aspect,
            "firstFrame": request.first_frame_url is not None,
        },
        "nodeId": node_id,
        "workspaceId": workspace_id,
    }


async def _para_audio(
    task: StoredTask,
    progress: ProgressFn,
    generator: dict[str, Any],
    workspace_id: str,
    node_id: str,
) -> dict[str, Any]:
    text = str(generator.get("prompt") or "").strip()
    if not text:
        raise TaskFailureError("invalid_payload", "prompt is required for audio")
    params = generator.get("params") or {}
    model = generator.get("model")
    request = SpeechRequest(
        text=text,
        voice=str(params.get("voice") or "Cherry"),
        model=None if model in (None, "", "Auto") else str(model),
        language_type=str(params["language"]) if params.get("language") else None,
    )
    await progress(10)
    try:
        spoken = await get_speech_provider().synthesize(request)
    except SpeechGenerationError as exc:
        raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc
    await progress(70)
    asset = await _persist(
        spoken.url, _asset_key(task, workspace_id, node_id, "1.wav"), "audio/wav"
    )
    return {
        "mode": "audio",
        "assets": [asset],
        "model": spoken.model,
        "provider": spoken.provider,
        "voice": spoken.voice,
        "usage": spoken.usage,
        "nodeId": node_id,
        "workspaceId": workspace_id,
    }


async def handle_para_generate(
    task: StoredTask, progress: ProgressFn
) -> dict[str, Any]:
    generator = task.payload.get("generator") or {}
    mode = str(generator.get("mode") or "image")
    node_id = str(task.payload.get("nodeId") or "")
    workspace_id = str(task.payload.get("workspaceId") or "")
    if not node_id or not workspace_id:
        raise TaskFailureError("invalid_payload", "workspaceId and nodeId are required")

    if mode == "text":
        prompt = generator.get("prompt")
        if not prompt:
            raise TaskFailureError(
                "invalid_payload", "prompt is required for text generation"
            )
        result = await _llm_generate(
            {"prompt": prompt, "model": generator.get("model")}
        )
        return {**result, "mode": "text"}

    if mode == "video":
        return await _para_video(task, progress, generator, workspace_id, node_id)
    if mode == "audio":
        return await _para_audio(task, progress, generator, workspace_id, node_id)
    if mode != "image":
        raise TaskFailureError(
            "unsupported_mode", f"para.generate does not support mode '{mode}' yet"
        )

    prompt = str(generator.get("prompt") or "").strip()
    if not prompt:
        raise TaskFailureError(
            "invalid_payload", "prompt is required for image generation"
        )
    params = generator.get("params") or {}
    references = _reference_urls(generator)
    count = int(generator.get("count") or 1)

    try:
        provider = get_image_provider()
    except ImageGenerationError as exc:
        raise TaskFailureError(exc.code, str(exc)) from exc

    await progress(10)
    request = ImageGenerationRequest(
        prompt=prompt,
        model=(
            None
            if generator.get("model") in (None, "", "Auto")
            else str(generator["model"])
        ),
        aspect=str(params.get("aspect") or params.get("ratio") or "16:9"),
        n=count,
        negative_prompt=(
            str(params["negative_prompt"]) if params.get("negative_prompt") else None
        ),
        reference_urls=references,
        seed=(int(params["seed"]) if params.get("seed") is not None else None),
    )
    try:
        generated = await provider.generate(request)
    except ImageGenerationError as exc:
        raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc
    await progress(60)

    assets: list[dict[str, Any]] = []
    total = len(generated.urls)
    for index, url in enumerate(generated.urls):
        key = (
            f"para/{sanitize_filename(task.tenant_id)}/{sanitize_filename(workspace_id)}/"
            f"{sanitize_filename(node_id)}/{task.id}-{index + 1}.png"
        )
        try:
            persisted = await persist_from_url(url, key)
        except PersistError as exc:
            raise TaskFailureError(exc.code, str(exc), retryable=exc.retryable) from exc
        assets.append(
            {
                "url": persisted.url,
                "key": persisted.key,
                "contentType": persisted.content_type,
                "size": persisted.size,
            }
        )
        await progress(60 + int(35 * (index + 1) / max(1, total)))

    return {
        "mode": "image",
        "assets": assets,
        "model": generated.model,
        "provider": generated.provider,
        "usage": generated.usage,
        "nodeId": node_id,
        "workspaceId": workspace_id,
    }


HANDLERS: dict[str, Callable[[StoredTask, ProgressFn], Awaitable[dict[str, Any]]]] = {
    "llm.generate": handle_llm_generate,
    "para.generate": handle_para_generate,
}
