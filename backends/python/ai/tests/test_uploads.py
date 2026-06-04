"""Tests for direct-to-object-storage upload metadata APIs."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest

UPLOADS_URL = "/api/v1/uploads"
TEST_SIGNING_VALUE = "test-signing-value-at-least-32-bytes"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _service_headers(*, signing_key: str, tenant_id: str = "tenant_uploads"):
    now = int(time.time())
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(
        json.dumps(
            {
                "userId": "user_uploads",
                "organizationId": tenant_id,
                "role": "ADMIN",
                "plan": "PRO",
                "iat": now,
                "exp": now + 300,
                "jti": "upload-test-token",
            }
        ).encode()
    )
    signature = hmac.new(
        signing_key.encode(),
        f"{header}.{payload}".encode(),
        hashlib.sha256,
    ).digest()
    token = f"{header}.{payload}.{_b64url(signature)}"
    return {
        "x-service-token": token,
        "x-organization-id": tenant_id,
        "x-user-id": "user_uploads",
        "x-role": "ADMIN",
        "x-plan": "PRO",
    }


@pytest.mark.asyncio
async def test_presign_complete_and_get_upload_record(client, monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    monkeypatch.setenv("UPLOAD_STORE_PROVIDER", "memory")
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "local")
    monkeypatch.setenv("UPLOAD_BUCKET", "nebutra-uploads")
    monkeypatch.setenv("UPLOAD_LOCAL_BASE_URL", "https://uploads.test")

    presign = await client.post(
        f"{UPLOADS_URL}/presign",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
        json={
            "filename": "Quarterly Plan.pdf",
            "content_type": "application/pdf",
            "size": 1234,
            "metadata": {"source": "test"},
            "idempotency_key": "upload-once",
        },
    )

    assert presign.status_code == 201
    created = presign.json()
    assert created["id"].startswith("upload_")
    assert created["status"] == "pending"
    assert created["provider"] == "local"
    assert created["bucket"] == "nebutra-uploads"
    assert created["content_type"] == "application/pdf"
    assert created["size"] == 1234
    assert created["metadata"] == {"source": "test"}
    assert created["key"].startswith(
        f"tenants/tenant_uploads/uploads/{created['id']}/raw/"
    )
    assert created["presigned_upload"]["method"] == "PUT"
    assert created["presigned_upload"]["headers"] == {
        "Content-Type": "application/pdf"
    }
    assert "Quarterly_Plan.pdf" in created["presigned_upload"]["url"]

    duplicate = await client.post(
        f"{UPLOADS_URL}/presign",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
        json={
            "filename": "Quarterly Plan.pdf",
            "content_type": "application/pdf",
            "size": 1234,
            "idempotency_key": "upload-once",
        },
    )
    assert duplicate.status_code == 201
    assert duplicate.json()["id"] == created["id"]

    complete = await client.post(
        f"{UPLOADS_URL}/complete",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
        json={
            "upload_id": created["id"],
            "size": 1234,
            "etag": '"etag-123"',
            "checksum_sha256": "a" * 64,
        },
    )

    assert complete.status_code == 200
    completed = complete.json()
    assert completed["id"] == created["id"]
    assert completed["status"] == "completed"
    assert completed["etag"] == '"etag-123"'
    assert completed["checksum_sha256"] == "a" * 64

    fetched = await client.get(
        f"{UPLOADS_URL}/{created['id']}",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
    )

    assert fetched.status_code == 200
    assert fetched.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_production_requires_persistent_upload_store(client, monkeypatch):
    monkeypatch.setenv("SERVICE_SECRET", TEST_SIGNING_VALUE)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("UPLOAD_STORE_PROVIDER", raising=False)

    response = await client.post(
        f"{UPLOADS_URL}/presign",
        headers=_service_headers(signing_key=TEST_SIGNING_VALUE),
        json={
            "filename": "report.pdf",
            "content_type": "application/pdf",
            "size": 100,
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "upload_store_not_configured"


def test_upload_provider_selection_is_provider_switchable(monkeypatch):
    from app.uploads.storage import (
        LocalUploadStorageProvider,
        OssUploadStorageProvider,
        S3UploadStorageProvider,
        resolve_upload_storage_provider,
    )

    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "local")
    assert isinstance(resolve_upload_storage_provider(), LocalUploadStorageProvider)
    assert resolve_upload_storage_provider().provider == "local"

    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "r2")
    monkeypatch.setenv("R2_ACCOUNT_ID", "account")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    r2_provider = resolve_upload_storage_provider()
    assert isinstance(r2_provider, S3UploadStorageProvider)
    assert r2_provider.provider == "r2"

    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "oss")
    monkeypatch.setenv("OSS_ENDPOINT", "oss-cn-hangzhou.aliyuncs.com")
    monkeypatch.setenv("OSS_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("OSS_ACCESS_KEY_SECRET", "secret")
    oss_provider = resolve_upload_storage_provider()
    assert isinstance(oss_provider, OssUploadStorageProvider)
    assert oss_provider.provider == "oss"

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "local")
    with pytest.raises(RuntimeError, match="local upload storage is not allowed"):
        resolve_upload_storage_provider()
