"""Tests for the /api/v1/embed endpoint."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

EMBED_URL = "/api/v1/embed/"

MOCK_RESULT = SimpleNamespace(
    embeddings=[[0.1, 0.2, 0.3]],
    model="text-embedding-3-small",
    usage={"total_tokens": 3},
)


@pytest.mark.asyncio
async def test_embed_success(client):
    provider = SimpleNamespace(name="mock", embed=AsyncMock(return_value=MOCK_RESULT))

    with patch(
        "app.api.v1.routes_embed.get_default_provider",
        Mock(return_value=provider),
    ):
        response = await client.post(EMBED_URL, json={"input": "hello world"})

    assert response.status_code == 200
    data = response.json()
    assert data["embeddings"] == [[0.1, 0.2, 0.3]]
    assert data["dimensions"] == 3


@pytest.mark.asyncio
async def test_embed_custom_model(client):
    provider = SimpleNamespace(name="mock", embed=AsyncMock(return_value=MOCK_RESULT))

    with patch(
        "app.api.v1.routes_embed.get_default_provider",
        Mock(return_value=provider),
    ):
        await client.post(
            EMBED_URL,
            json={"input": "test", "model": "text-embedding-3-large"},
        )
        embed_request = provider.embed.call_args.args[0]
        assert embed_request.model == "text-embedding-3-large"


@pytest.mark.asyncio
async def test_embed_empty_text_returns_422(client):
    """Empty string should fail Pydantic min_length validation if configured."""
    response = await client.post(EMBED_URL, json={})
    # text field is required
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_embed_service_error_returns_500(client):
    provider = SimpleNamespace(
        name="mock", embed=AsyncMock(side_effect=ConnectionError("OpenAI unreachable"))
    )

    with patch(
        "app.api.v1.routes_embed.get_default_provider",
        Mock(return_value=provider),
    ):
        response = await client.post(EMBED_URL, json={"input": "fail"})

    assert response.status_code == 502
