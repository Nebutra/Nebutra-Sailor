"""Tests for Python service-to-service tenant authentication."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

from _shared.auth import get_tenant

TEST_SIGNING_VALUE = "test-signing-value-at-least-32-bytes"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _jwt_token(secret: str, claims: dict[str, object]) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps(claims).encode())
    signature = hmac.new(
        secret.encode(),
        f"{header}.{payload}".encode(),
        hashlib.sha256,
    ).digest()
    return f"{header}.{payload}.{_b64url(signature)}"


def _legacy_hmac(secret: str, *, org_id: str) -> str:
    return hmac.new(
        secret.encode(),
        f":{org_id}::PRO".encode(),
        hashlib.sha256,
    ).hexdigest()


@pytest.mark.asyncio
async def test_get_tenant_accepts_short_lived_jwt_service_token(monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    now = int(time.time())
    token = _jwt_token(
        TEST_SIGNING_VALUE,
        {
            "organizationId": "org_123",
            "plan": "PRO",
            "iat": now,
            "exp": now + 300,
            "jti": "jwt_1",
        },
    )

    tenant = await get_tenant(
        x_service_token=token,
        x_organization_id="org_123",
        x_plan="PRO",
    )

    assert tenant.organization_id == "org_123"
    assert tenant.plan == "PRO"
    assert tenant.authenticated is True


@pytest.mark.asyncio
async def test_get_tenant_rejects_retired_hex_hmac_tokens(monkeypatch):
    """Legacy hex-HMAC is no longer accepted (JWT-only, matches s2s.ts)."""
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    token = _legacy_hmac(TEST_SIGNING_VALUE, org_id="org_legacy")

    with pytest.raises(HTTPException) as exc_info:
        await get_tenant(
            x_service_token=token,
            x_organization_id="org_legacy",
            x_plan="PRO",
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "invalid_service_token"


@pytest.mark.asyncio
async def test_get_tenant_rejects_jwt_claim_mismatch(monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    now = int(time.time())
    token = _jwt_token(
        TEST_SIGNING_VALUE,
        {
            "organizationId": "org_expected",
            "plan": "PRO",
            "iat": now,
            "exp": now + 300,
            "jti": "jwt_mismatch",
        },
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_tenant(
            x_service_token=token,
            x_organization_id="org_spoofed",
            x_plan="PRO",
        )

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_tenant_anonymous_without_service_token(monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)

    tenant = await get_tenant()

    assert tenant.authenticated is False
    assert tenant.plan == "FREE"
    assert tenant.organization_id is None
