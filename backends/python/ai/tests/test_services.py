"""Tests for provider-backed service compatibility helpers."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

from services.embedding_service import create_embedding
from services.llm_service import generate_text
from services.translate_service import translate_text


@pytest.mark.asyncio
async def test_generate_text_uses_provider_chat():
    provider = SimpleNamespace(
        chat=AsyncMock(
            return_value=SimpleNamespace(
                content="Hello",
                model="mock-chat",
                usage={"total_tokens": 4},
            )
        )
    )

    with patch(
        "services.llm_service.get_default_provider", Mock(return_value=provider)
    ):
        result = await generate_text("Say hello", max_tokens=12, temperature=0.1)

    chat_request = provider.chat.call_args.args[0]
    assert chat_request.model == "Qwen/Qwen2.5-72B-Instruct"
    assert chat_request.messages[0].content == "Say hello"
    assert chat_request.max_tokens == 12
    assert result == {"text": "Hello", "model": "mock-chat", "tokens_used": 4}


@pytest.mark.asyncio
async def test_create_embedding_uses_provider_embed():
    provider = SimpleNamespace(
        embed=AsyncMock(
            return_value=SimpleNamespace(
                embeddings=[[0.1, 0.2]],
                model="mock-embedding",
            )
        )
    )

    with patch(
        "services.embedding_service.get_default_provider", Mock(return_value=provider)
    ):
        result = await create_embedding("hello", model="custom-embedding")

    embed_request = provider.embed.call_args.args[0]
    assert embed_request.model == "custom-embedding"
    assert embed_request.input == "hello"
    assert result == {
        "embedding": [0.1, 0.2],
        "model": "mock-embedding",
        "dimensions": 2,
    }


@pytest.mark.asyncio
async def test_translate_text_preserves_legacy_response_shape():
    provider = SimpleNamespace(
        chat=AsyncMock(return_value=SimpleNamespace(content="你好", model="mock-chat"))
    )

    with patch(
        "services.translate_service.get_default_provider", Mock(return_value=provider)
    ):
        result = await translate_text("hello", source="en", target="zh")

    chat_request = provider.chat.call_args.args[0]
    assert "from English to Chinese" in chat_request.messages[0].content
    assert result == {"translatedText": "你好", "source": "en", "target": "zh"}
