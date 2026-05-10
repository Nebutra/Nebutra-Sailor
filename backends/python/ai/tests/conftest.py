"""
pytest fixtures for the ai-service test suite.

Uses httpx.AsyncClient with the FastAPI app in ASGI transport —
no real network calls are made; external services (OpenAI) are mocked
via unittest.mock.AsyncMock.
"""

from __future__ import annotations

import os
import sys

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure _shared and services/ are importable without a real install
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    """Return an async test client for the ai-service FastAPI app."""
    # Patch OTel endpoint so instrument_app exits early (no collector in CI)
    os.environ.pop("OTEL_EXPORTER_OTLP_ENDPOINT", None)
    # AsyncOpenAI validates api_key at instantiation; set a stub so module-level
    # client creation doesn't raise before service functions are mocked.
    os.environ.setdefault("OPENAI_API_KEY", "sk-test-stub-key-for-ci")

    from app.main import app  # import after patching env

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
