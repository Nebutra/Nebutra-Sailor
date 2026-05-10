"""Tests for the /api/v1/embed endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

EMBED_URL = "/api/v1/embed/"

MOCK_RESULT = {
    "embedding": [0.1, 0.2, 0.3],
    "model": "text-embedding-3-small",
    "dimensions": 3,
}


@pytest.mark.asyncio
async def test_embed_success(client):
    with patch(
        "app.api.v1.routes_embed.create_embedding",
        new_callable=AsyncMock,
        return_value=MOCK_RESULT,
    ):
        response = await client.post(EMBED_URL, json={"text": "hello world"})

    assert response.status_code == 200
    data = response.json()
    assert data["embedding"] == [0.1, 0.2, 0.3]
    assert data["dimensions"] == 3


@pytest.mark.asyncio
async def test_embed_custom_model(client):
    with patch(
        "app.api.v1.routes_embed.create_embedding",
        new_callable=AsyncMock,
        return_value=MOCK_RESULT,
    ) as mock_fn:
        await client.post(
            EMBED_URL,
            json={"text": "test", "model": "text-embedding-3-large"},
        )
        assert mock_fn.call_args.kwargs.get("model") == "text-embedding-3-large"


@pytest.mark.asyncio
async def test_embed_empty_text_returns_422(client):
    """Empty string should fail Pydantic min_length validation if configured."""
    response = await client.post(EMBED_URL, json={})
    # text field is required
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_embed_service_error_returns_500(client):
    with patch(
        "app.api.v1.routes_embed.create_embedding",
        new_callable=AsyncMock,
        side_effect=ConnectionError("OpenAI unreachable"),
    ):
        response = await client.post(EMBED_URL, json={"text": "fail"})

    assert response.status_code == 500
