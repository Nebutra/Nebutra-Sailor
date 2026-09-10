"""Persist a generated output into our object storage.

Provider-agnostic: reuse the presigned-upload seat every storage provider already
implements, then PUT the bytes. The public URL is UPLOAD_PUBLIC_BASE_URL/<key>;
without it we fail closed — a provider-hosted temporary URL is not an asset.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

from app.uploads.storage import (
    UploadStorageProvider,
    UploadStorageUnavailableError,
    resolve_upload_storage_provider,
)


class PersistError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class PersistedObject:
    key: str
    url: str
    content_type: str
    size: int


def public_url_for(key: str) -> str:
    base = os.environ.get("UPLOAD_PUBLIC_BASE_URL") or ""
    if not base:
        raise PersistError(
            "storage_public_url_unconfigured",
            "UPLOAD_PUBLIC_BASE_URL is required to publish generated assets",
        )
    return f"{base.rstrip('/')}/{key}"


async def persist_from_url(
    source_url: str,
    key: str,
    *,
    storage: UploadStorageProvider | None = None,
    client: httpx.AsyncClient | None = None,
) -> PersistedObject:
    http = client or httpx.AsyncClient(timeout=120.0)
    try:
        try:
            download = await http.get(source_url)
        except httpx.HTTPError as exc:
            raise PersistError("output_fetch_failed", str(exc), retryable=True) from exc
        if download.status_code >= 400:
            raise PersistError(
                "output_fetch_failed",
                f"source returned {download.status_code}",
                retryable=True,
            )
        content_type = download.headers.get("content-type", "image/png").split(";")[0]
        body = download.content

        try:
            provider = storage or resolve_upload_storage_provider()
        except UploadStorageUnavailableError as exc:
            raise PersistError("storage_unavailable", str(exc)) from exc
        presigned = await provider.create_presigned_upload(
            key=key, content_type=content_type
        )
        try:
            put = await http.request(
                presigned.method, presigned.url, content=body, headers=presigned.headers
            )
        except httpx.HTTPError as exc:
            raise PersistError("storage_put_failed", str(exc), retryable=True) from exc
        if put.status_code >= 400:
            raise PersistError(
                "storage_put_failed",
                f"storage returned {put.status_code}",
                retryable=True,
            )
        return PersistedObject(
            key=key, url=public_url_for(key), content_type=content_type, size=len(body)
        )
    finally:
        if client is None:
            await http.aclose()
