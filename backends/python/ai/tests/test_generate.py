"""Tests for the /api/v1/generate endpoint."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

GENERATE_URL = "/api/v1/generate/"

MOCK_RESULT = SimpleNamespace(
    content="Hello, world!",
    model="gpt-5.2",
    usage={
        "prompt_tokens": 5,
        "completion_tokens": 7,
        "total_tokens": 12,
    },
    finish_reason="stop",
    tool_calls=None,
)


@pytest.mark.asyncio
async def test_generate_success(client):
    provider = SimpleNamespace(name="mock", chat=AsyncMock(return_value=MOCK_RESULT))

    with patch(
        "app.api.v1.routes_generate.get_default_provider",
        Mock(return_value=provider),
    ):
        response = await client.post(
            GENERATE_URL,
            json={"prompt": "Say hello", "max_tokens": 50},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "Hello, world!"
    assert data["model"] == "gpt-5.2"
    assert data["total_tokens"] == 12


@pytest.mark.asyncio
async def test_generate_default_model(client):
    """Defaults to the route provider model when model is omitted."""
    provider = SimpleNamespace(name="mock", chat=AsyncMock(return_value=MOCK_RESULT))

    with patch(
        "app.api.v1.routes_generate.get_default_provider",
        Mock(return_value=provider),
    ):
        await client.post(GENERATE_URL, json={"prompt": "hi"})
        chat_request = provider.chat.call_args.args[0]
        assert chat_request.model == "Qwen/Qwen2.5-72B-Instruct"


@pytest.mark.asyncio
async def test_generate_service_error_returns_500(client):
    provider = SimpleNamespace(
        name="mock", chat=AsyncMock(side_effect=RuntimeError("upstream failure"))
    )

    with patch(
        "app.api.v1.routes_generate.get_default_provider",
        Mock(return_value=provider),
    ):
        response = await client.post(
            GENERATE_URL,
            json={"prompt": "fail"},
        )

    assert response.status_code == 502
    assert "provider error" in response.json()["detail"].lower()


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
