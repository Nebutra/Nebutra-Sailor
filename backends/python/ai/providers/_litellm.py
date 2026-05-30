"""
Shared litellm adapter helpers.

All concrete providers delegate their wire protocol to litellm
(https://github.com/BerriAI/litellm). This module centralises the
translation between the package's own request/response dataclasses
(``providers.base``) and litellm's call surface so that each provider
stays a thin configuration shim with no hand-written HTTP / streaming
boilerplate.

Routing model:
  Every supported backend speaks the OpenAI wire protocol, so models are
  addressed with the ``openai/<model>`` prefix and pointed at the right
  host via ``base_url`` (chat) / ``api_base`` (embeddings). litellm does
  not need a first-class provider entry for SiliconFlow — the
  openai-compatible route covers chat + embeddings, and the ``infinity``
  rerank provider covers SiliconFlow's Cohere-style ``/rerank`` endpoint.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import litellm

from .base import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)

# Address every openai-compatible backend through litellm's openai route.
_OPENAI_ROUTE_PREFIX = "openai/"


def _openai_route(model: str) -> str:
    """Force a model id onto litellm's openai-compatible route.

    Every backend behind this helper (OpenAI, SiliconFlow) speaks the OpenAI
    wire protocol and is addressed by ``base_url`` / ``api_base``, so the
    ``openai/`` prefix is always correct here — including vendor-namespaced
    SiliconFlow ids such as ``deepseek-ai/DeepSeek-V3`` which would otherwise
    be misread by litellm as a ``deepseek-ai`` provider route. Already-routed
    ids are left untouched.

    Gateways that do their own multi-provider routing (OpenRouter) bypass this
    by passing ``route_model=False``.
    """
    if model.startswith(_OPENAI_ROUTE_PREFIX):
        return model
    return f"{_OPENAI_ROUTE_PREFIX}{model}"


def _messages_to_dicts(request: ChatCompletionRequest) -> list[dict[str, Any]]:
    return [
        {"role": m.role, "content": m.content, "name": m.name}
        for m in request.messages
    ]


def _completion_kwargs(
    request: ChatCompletionRequest,
    *,
    base_url: str | None,
    api_key: str,
    stream: bool,
    route_model: bool,
    extra_headers: dict[str, str] | None = None,
    extra_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "model": _openai_route(request.model) if route_model else request.model,
        "messages": _messages_to_dicts(request),
        "api_key": api_key,
        "stream": stream,
    }
    if base_url is not None:
        kwargs["base_url"] = base_url
    if request.temperature is not None:
        kwargs["temperature"] = request.temperature
    if request.max_tokens is not None:
        kwargs["max_tokens"] = request.max_tokens
    if request.top_p is not None:
        kwargs["top_p"] = request.top_p
    if request.stop:
        kwargs["stop"] = request.stop
    if not stream and request.tools:
        kwargs["tools"] = request.tools
    if not stream and request.response_format:
        kwargs["response_format"] = request.response_format
    if extra_headers:
        kwargs["extra_headers"] = extra_headers
    if extra_body:
        kwargs.update(extra_body)
    return kwargs


async def chat_completion(
    request: ChatCompletionRequest,
    *,
    base_url: str | None,
    api_key: str,
    route_model: bool = True,
    extra_headers: dict[str, str] | None = None,
    extra_body: dict[str, Any] | None = None,
) -> ChatCompletionResponse:
    """Run a non-streaming chat completion via litellm and adapt the response."""
    response = await litellm.acompletion(
        **_completion_kwargs(
            request,
            base_url=base_url,
            api_key=api_key,
            stream=False,
            route_model=route_model,
            extra_headers=extra_headers,
            extra_body=extra_body,
        )
    )
    return _adapt_chat_response(response)


async def chat_completion_stream(
    request: ChatCompletionRequest,
    *,
    base_url: str | None,
    api_key: str,
    route_model: bool = True,
    extra_headers: dict[str, str] | None = None,
    extra_body: dict[str, Any] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a chat completion, yielding text deltas (content only)."""
    stream = await litellm.acompletion(
        **_completion_kwargs(
            request,
            base_url=base_url,
            api_key=api_key,
            stream=True,
            route_model=route_model,
            extra_headers=extra_headers,
            extra_body=extra_body,
        )
    )
    async for chunk in stream:
        choices = getattr(chunk, "choices", None)
        if not choices:
            continue
        delta = choices[0].delta
        content = getattr(delta, "content", None)
        if content:
            yield content


def _adapt_chat_response(response: Any) -> ChatCompletionResponse:
    choice = response.choices[0]
    message = choice.message

    tool_calls = None
    raw_tool_calls = getattr(message, "tool_calls", None)
    if raw_tool_calls:
        tool_calls = [
            {
                "id": tc.id,
                "type": tc.type or "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in raw_tool_calls
        ]

    usage = response.usage
    return ChatCompletionResponse(
        id=response.id,
        model=response.model,
        content=message.content,
        finish_reason=choice.finish_reason,
        usage={
            "prompt_tokens": getattr(usage, "prompt_tokens", 0) if usage else 0,
            "completion_tokens": getattr(usage, "completion_tokens", 0)
            if usage
            else 0,
            "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
        },
        tool_calls=tool_calls,
        # DeepSeek-R1 / o1-style reasoning. litellm surfaces it as
        # ``reasoning_content`` on the message (openai route passes it through).
        reasoning_content=getattr(message, "reasoning_content", None),
    )


async def embedding(
    request: EmbeddingRequest,
    *,
    api_base: str | None,
    api_key: str,
) -> EmbeddingResponse:
    """Create embeddings via litellm and adapt the response."""
    kwargs: dict[str, Any] = {
        "model": _openai_route(request.model),
        "input": request.input,
        "api_key": api_key,
    }
    if api_base is not None:
        kwargs["api_base"] = api_base
    if request.encoding_format is not None:
        kwargs["encoding_format"] = request.encoding_format

    response = await litellm.aembedding(**kwargs)

    usage = response.usage
    return EmbeddingResponse(
        model=response.model,
        embeddings=[item["embedding"] for item in response.data],
        usage={
            "prompt_tokens": getattr(usage, "prompt_tokens", 0) if usage else 0,
            "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
        },
    )

# NOTE: reranking is intentionally NOT delegated to litellm. SiliconFlow's
# /rerank returns ``document`` as an object ({"text": ...} / {"image": ...})
# and reports usage under ``meta.tokens``; litellm's closest route
# (``infinity``) assumes ``document`` is a plain string and reads ``usage``,
# so it ValidationErrors / misparses on SiliconFlow's actual response. The
# native httpx call in SiliconFlowProvider.rerank stays authoritative.
