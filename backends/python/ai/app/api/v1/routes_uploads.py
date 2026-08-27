"""Direct-to-object-storage upload metadata routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from _shared.auth import TenantContext, require_organization
from app.uploads.models import (
    UploadCompleteRequest,
    UploadEnvelope,
    UploadPresignRequest,
)
from app.uploads.storage import (
    UploadStorageUnavailableError,
    resolve_upload_storage_provider,
)
from app.uploads.store import (
    UploadNotFoundError,
    UploadStoreUnavailableError,
    build_upload_key,
    new_upload_id,
    resolve_upload_store,
)

router = APIRouter()
UploadTenant = Annotated[TenantContext, Depends(require_organization)]


@router.post("/presign", response_model=UploadEnvelope, status_code=201)
async def presign_upload(
    request: UploadPresignRequest,
    tenant: UploadTenant,
) -> UploadEnvelope:
    try:
        store = resolve_upload_store()
        storage = resolve_upload_storage_provider()
        tenant_id = tenant.organization_id or ""

        if request.idempotency_key:
            existing = await store.find_by_idempotency(
                tenant_id,
                request.idempotency_key,
            )
            if existing:
                presigned = await storage.create_presigned_upload(
                    key=existing.key,
                    content_type=existing.content_type,
                )
                return existing.envelope(presigned)

        upload_id = new_upload_id()
        key = build_upload_key(tenant_id, upload_id, request.filename)
        presigned = await storage.create_presigned_upload(
            key=key,
            content_type=request.content_type,
        )
        upload = await store.create_pending(
            request,
            tenant,
            upload_id=upload_id,
            provider=storage.provider,
            bucket=storage.bucket,
            key=key,
            upload_url_expires_at=presigned.expires_at,
        )
    except UploadStoreUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="upload_store_not_configured",
        ) from exc
    except UploadStorageUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="upload_storage_not_configured",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return upload.envelope(presigned)


@router.post("/complete", response_model=UploadEnvelope)
async def complete_upload(
    request: UploadCompleteRequest,
    tenant: UploadTenant,
) -> UploadEnvelope:
    try:
        store = resolve_upload_store()
        upload = await store.complete(request, tenant.organization_id or "")
    except UploadStoreUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="upload_store_not_configured",
        ) from exc
    except UploadNotFoundError as exc:
        raise HTTPException(status_code=404, detail="upload_not_found") from exc
    return upload.envelope()


@router.get("/{upload_id}", response_model=UploadEnvelope)
async def get_upload(
    upload_id: str,
    tenant: UploadTenant,
) -> UploadEnvelope:
    try:
        store = resolve_upload_store()
        upload = await store.get(upload_id, tenant.organization_id or "")
    except UploadStoreUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="upload_store_not_configured",
        ) from exc
    except UploadNotFoundError as exc:
        raise HTTPException(status_code=404, detail="upload_not_found") from exc
    return upload.envelope()
