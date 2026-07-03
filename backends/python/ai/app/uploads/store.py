"""Upload metadata persistence for direct object-storage uploads."""

from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import replace
from datetime import datetime
from typing import Any, Protocol

from _shared.auth import TenantContext
from app.uploads.models import (
    StoredUpload,
    UploadCompleteRequest,
    UploadPresignRequest,
    UploadStatus,
    metadata_json,
    utcnow,
)


class UploadStoreUnavailableError(RuntimeError):
    """Raised when production has no persistent upload metadata store."""


class UploadNotFoundError(LookupError):
    """Raised when a tenant-scoped upload cannot be found."""


class UploadStore(Protocol):
    async def find_by_idempotency(
        self,
        tenant_id: str,
        idempotency_key: str,
    ) -> StoredUpload | None: ...

    async def create_pending(
        self,
        request: UploadPresignRequest,
        tenant: TenantContext,
        *,
        upload_id: str,
        provider: str,
        bucket: str,
        key: str,
        upload_url_expires_at: datetime,
    ) -> StoredUpload: ...

    async def get(self, upload_id: str, tenant_id: str) -> StoredUpload: ...

    async def complete(
        self,
        request: UploadCompleteRequest,
        tenant_id: str,
    ) -> StoredUpload: ...


def new_upload_id() -> str:
    return f"upload_{uuid.uuid4().hex}"


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename.strip())
    cleaned = cleaned.strip("._")
    return cleaned[:255] or "upload.bin"


def build_upload_key(tenant_id: str, upload_id: str, filename: str) -> str:
    return f"tenants/{tenant_id}/uploads/{upload_id}/raw/{sanitize_filename(filename)}"


class MemoryUploadStore:
    def __init__(self) -> None:
        self._uploads: dict[tuple[str, str], StoredUpload] = {}
        self._idempotency: dict[tuple[str, str], str] = {}

    async def find_by_idempotency(
        self,
        tenant_id: str,
        idempotency_key: str,
    ) -> StoredUpload | None:
        upload_id = self._idempotency.get((tenant_id, idempotency_key))
        if not upload_id:
            return None
        return await self.get(upload_id, tenant_id)

    async def create_pending(
        self,
        request: UploadPresignRequest,
        tenant: TenantContext,
        *,
        upload_id: str,
        provider: str,
        bucket: str,
        key: str,
        upload_url_expires_at: datetime,
    ) -> StoredUpload:
        tenant_id = _require_tenant_id(tenant)
        now = utcnow()
        upload = StoredUpload(
            id=upload_id,
            tenant_id=tenant_id,
            user_id=tenant.user_id,
            status=UploadStatus.PENDING,
            provider=provider,
            bucket=bucket,
            key=key,
            filename=request.filename,
            content_type=request.content_type,
            size=request.size,
            metadata=metadata_json(request.metadata),
            idempotency_key=request.idempotency_key,
            upload_url_expires_at=upload_url_expires_at,
            etag=None,
            checksum_sha256=None,
            created_at=now,
            updated_at=now,
            completed_at=None,
        )
        self._uploads[(tenant_id, upload.id)] = upload
        if request.idempotency_key:
            self._idempotency[(tenant_id, request.idempotency_key)] = upload.id
        return upload

    async def get(self, upload_id: str, tenant_id: str) -> StoredUpload:
        upload = self._uploads.get((tenant_id, upload_id))
        if upload is None:
            raise UploadNotFoundError(upload_id)
        return upload

    async def complete(
        self,
        request: UploadCompleteRequest,
        tenant_id: str,
    ) -> StoredUpload:
        upload = await self.get(request.upload_id, tenant_id)
        updated = replace(
            upload,
            status=UploadStatus.COMPLETED,
            size=request.size,
            etag=request.etag,
            checksum_sha256=request.checksum_sha256,
            updated_at=utcnow(),
            completed_at=utcnow(),
        )
        self._uploads[(tenant_id, request.upload_id)] = updated
        return updated


class PostgresUploadStore:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _connect(self):  # pragma: no cover - requires a live Postgres fixture.
        import asyncpg

        return await asyncpg.connect(self._dsn)

    async def find_by_idempotency(  # pragma: no cover
        self,
        tenant_id: str,
        idempotency_key: str,
    ) -> StoredUpload | None:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                """
                SELECT * FROM public.uploads
                WHERE tenant_id = $1 AND idempotency_key = $2
                """,
                tenant_id,
                idempotency_key,
            )
            return _row_to_upload(row) if row else None
        finally:
            await conn.close()

    async def create_pending(  # pragma: no cover
        self,
        request: UploadPresignRequest,
        tenant: TenantContext,
        *,
        upload_id: str,
        provider: str,
        bucket: str,
        key: str,
        upload_url_expires_at: datetime,
    ) -> StoredUpload:
        tenant_id = _require_tenant_id(tenant)
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                """
                INSERT INTO public.uploads (
                    id, tenant_id, user_id, status, provider, bucket, object_key,
                    filename, content_type, size_bytes, metadata, idempotency_key,
                    upload_url_expires_at, updated_at
                )
                VALUES (
                    $1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9,
                    $10::jsonb, $11, $12, CURRENT_TIMESTAMP
                )
                RETURNING *
                """,
                upload_id,
                tenant_id,
                tenant.user_id,
                provider,
                bucket,
                key,
                request.filename,
                request.content_type,
                request.size,
                json.dumps(metadata_json(request.metadata)),
                request.idempotency_key,
                upload_url_expires_at,
            )
            return _row_to_upload(row)
        finally:
            await conn.close()

    async def get(  # pragma: no cover
        self,
        upload_id: str,
        tenant_id: str,
    ) -> StoredUpload:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                "SELECT * FROM public.uploads WHERE id = $1 AND tenant_id = $2",
                upload_id,
                tenant_id,
            )
            if row is None:
                raise UploadNotFoundError(upload_id)
            return _row_to_upload(row)
        finally:
            await conn.close()

    async def complete(  # pragma: no cover
        self,
        request: UploadCompleteRequest,
        tenant_id: str,
    ) -> StoredUpload:
        conn = await self._connect()
        try:
            row = await conn.fetchrow(
                """
                UPDATE public.uploads
                SET status = 'COMPLETED',
                    size_bytes = $3,
                    etag = $4,
                    checksum_sha256 = $5,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
                """,
                request.upload_id,
                tenant_id,
                request.size,
                request.etag,
                request.checksum_sha256,
            )
            if row is None:
                raise UploadNotFoundError(request.upload_id)
            return _row_to_upload(row)
        finally:
            await conn.close()


_memory_upload_store = MemoryUploadStore()


def resolve_upload_store() -> UploadStore:
    provider = os.environ.get("UPLOAD_STORE_PROVIDER", "").lower()
    database_url = os.environ.get("DATABASE_URL")
    app_env = (
        os.environ.get("APP_ENV") or os.environ.get("ENV") or os.environ.get("NODE_ENV")
    )
    is_production = (app_env or "").lower() in {"prod", "production"}

    if provider == "memory":
        if is_production:
            raise UploadStoreUnavailableError(
                "memory upload store is not allowed in production"
            )
        return _memory_upload_store

    if provider in {"postgres", "postgresql"} or database_url:
        if not database_url:
            raise UploadStoreUnavailableError(
                "DATABASE_URL is required for postgres upload store"
            )
        return PostgresUploadStore(database_url)

    if is_production:
        raise UploadStoreUnavailableError(
            "DATABASE_URL is required for production upload store"
        )

    return _memory_upload_store


def _require_tenant_id(tenant: TenantContext) -> str:
    if not tenant.organization_id:
        raise ValueError("tenant organization is required")
    return tenant.organization_id


def _decode_json(value: Any) -> dict[str, str]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return metadata_json(value)
    if isinstance(value, str):
        return metadata_json(json.loads(value))
    return metadata_json(dict(value))


def _row_to_upload(row: Any) -> StoredUpload:
    return StoredUpload(
        id=row["id"],
        tenant_id=row["tenant_id"],
        user_id=row["user_id"],
        status=UploadStatus(row["status"].lower()),
        provider=row["provider"],
        bucket=row["bucket"],
        key=row["object_key"],
        filename=row["filename"],
        content_type=row["content_type"],
        size=row["size_bytes"],
        metadata=_decode_json(row["metadata"]),
        idempotency_key=row["idempotency_key"],
        upload_url_expires_at=row["upload_url_expires_at"],
        etag=row["etag"],
        checksum_sha256=row["checksum_sha256"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        completed_at=row["completed_at"],
    )
