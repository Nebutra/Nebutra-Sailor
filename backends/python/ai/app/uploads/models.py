"""Models for direct-to-object-storage uploads."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def utcnow() -> datetime:
    return datetime.now(UTC)


class UploadStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class UploadPresignRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=3, max_length=255)
    size: int = Field(gt=0, le=5 * 1024 * 1024 * 1024)
    metadata: dict[str, str] = Field(default_factory=dict)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=120)

    @field_validator("filename")
    @classmethod
    def filename_must_not_be_path(cls, value: str) -> str:
        normalized = value.strip()
        if "/" in normalized or "\\" in normalized or normalized in {"", ".", ".."}:
            raise ValueError("filename must be a base name")
        return normalized


class UploadCompleteRequest(BaseModel):
    upload_id: str = Field(min_length=1, max_length=128)
    size: int = Field(gt=0, le=5 * 1024 * 1024 * 1024)
    etag: str | None = Field(default=None, max_length=255)
    checksum_sha256: str | None = Field(default=None, min_length=64, max_length=64)

    @field_validator("checksum_sha256")
    @classmethod
    def checksum_must_be_hex(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if any(char not in "0123456789abcdef" for char in value.lower()):
            raise ValueError("checksum_sha256 must be lowercase hex")
        return value.lower()


class PresignedUploadEnvelope(BaseModel):
    url: str
    method: Literal["PUT", "POST"]
    headers: dict[str, str]
    expires_at: datetime


class UploadEnvelope(BaseModel):
    id: str
    status: UploadStatus
    provider: str
    bucket: str
    key: str
    filename: str
    content_type: str
    size: int
    metadata: dict[str, str]
    presigned_upload: PresignedUploadEnvelope | None = None
    etag: str | None = None
    checksum_sha256: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


@dataclass(frozen=True)
class PresignedUpload:
    url: str
    method: Literal["PUT", "POST"]
    headers: dict[str, str]
    expires_at: datetime

    def envelope(self) -> PresignedUploadEnvelope:
        return PresignedUploadEnvelope(
            url=self.url,
            method=self.method,
            headers=self.headers,
            expires_at=self.expires_at,
        )


@dataclass(frozen=True)
class StoredUpload:
    id: str
    tenant_id: str
    user_id: str | None
    status: UploadStatus
    provider: str
    bucket: str
    key: str
    filename: str
    content_type: str
    size: int
    metadata: dict[str, str]
    idempotency_key: str | None
    upload_url_expires_at: datetime
    etag: str | None
    checksum_sha256: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    def envelope(
        self,
        presigned_upload: PresignedUpload | None = None,
    ) -> UploadEnvelope:
        return UploadEnvelope(
            id=self.id,
            status=self.status,
            provider=self.provider,
            bucket=self.bucket,
            key=self.key,
            filename=self.filename,
            content_type=self.content_type,
            size=self.size,
            metadata=self.metadata,
            presigned_upload=presigned_upload.envelope() if presigned_upload else None,
            etag=self.etag,
            checksum_sha256=self.checksum_sha256,
            created_at=self.created_at,
            updated_at=self.updated_at,
            completed_at=self.completed_at,
        )


def metadata_json(metadata: dict[str, Any] | None) -> dict[str, str]:
    if not metadata:
        return {}
    return {str(key): str(value) for key, value in metadata.items()}
