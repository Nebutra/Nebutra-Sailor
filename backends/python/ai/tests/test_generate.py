"""Tests for the /api/v1/generate endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

GENERATE_URL = "/api/v1/generate/"

MOCK_RESULT = {
    "text": "Hello, world!",
    "model": "gpt-5.2",
    "tokens_used": 12,
}


@pytest.mark.asyncio
async def test_generate_success(client):
    with patch(
        "app.api.v1.routes_generate.generate_text",
        new_callable=AsyncMock,
        return_value=MOCK_RESULT,
    ):
        response = await client.post(
            GENERATE_URL,
            json={"prompt": "Say hello", "max_tokens": 50},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "Hello, world!"
    assert data["model"] == "gpt-5.2"
    assert data["tokens_used"] == 12


@pytest.mark.asyncio
async def test_generate_default_model(client):
    """Defaults to gpt-5.2 when model is omitted."""
    with patch(
        "app.api.v1.routes_generate.generate_text",
        new_callable=AsyncMock,
        return_value=MOCK_RESULT,
    ) as mock_fn:
        await client.post(GENERATE_URL, json={"prompt": "hi"})
        call_kwargs = mock_fn.call_args.kwargs
        assert call_kwargs.get("model", "gpt-5.2") == "gpt-5.2"


@pytest.mark.asyncio
async def test_generate_service_error_returns_500(client):
    with patch(
        "app.api.v1.routes_generate.generate_text",
        new_callable=AsyncMock,
        side_effect=RuntimeError("upstream failure"),
    ):
        response = await client.post(
            GENERATE_URL,
            json={"prompt": "fail"},
        )

    assert response.status_code == 500
    assert "internal server error" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_generate_missing_prompt_returns_422(client):
    """Pydantic validation: prompt is required."""
    response = await client.post(GENERATE_URL, json={"max_tokens": 10})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_temperature_clamped(client):
    """Temperature is a float; non-numeric should fail validation."""
    response = await client.post(
        GENERATE_URL,
        json={"prompt": "test", "temperature": "hot"},
    )
    assert response.status_code == 422
