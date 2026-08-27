"""Tests for shared health-check endpoints."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_liveness_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_livez_alias(client):
    response = await client.get("/livez")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness_no_deps_returns_200(client):
    """With no DATABASE_URL / REDIS_URL set, no checks run → always ready."""
    import os

    os.environ.pop("DATABASE_URL", None)
    os.environ.pop("REDIS_URL", None)

    response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ai"
    assert data["status"] == "running"
