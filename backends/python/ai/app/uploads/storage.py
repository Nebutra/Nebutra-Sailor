"""Provider-switchable direct upload URL generation."""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Protocol
from urllib.parse import quote

from app.uploads.models import PresignedUpload, utcnow


class UploadStorageProvider(Protocol):
    provider: str
    bucket: str

    async def create_presigned_upload(
        self,
        *,
        key: str,
        content_type: str,
        expires_in_seconds: int = 3600,
    ) -> PresignedUpload: ...


class UploadStorageUnavailableError(RuntimeError):
    """Raised when upload storage provider credentials are not configured."""


class LocalUploadStorageProvider:
    provider = "local"

    def __init__(self, bucket: str, base_url: str) -> None:
        self.bucket = bucket
        self._base_url = base_url.rstrip("/")

    async def create_presigned_upload(
        self,
        *,
        key: str,
        content_type: str,
        expires_in_seconds: int = 3600,
    ) -> PresignedUpload:
        return PresignedUpload(
            url=(
                f"{self._base_url}/upload"
                f"?bucket={quote(self.bucket)}&key={quote(key, safe='')}"
            ),
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=utcnow() + timedelta(seconds=expires_in_seconds),
        )


class S3UploadStorageProvider:
    def __init__(
        self,
        *,
        bucket: str,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        endpoint_url: str | None = None,
        provider: str = "s3",
    ) -> None:
        self.provider = provider
        self.bucket = bucket
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._region = region
        self._endpoint_url = endpoint_url

    async def create_presigned_upload(
        self,
        *,
        key: str,
        content_type: str,
        expires_in_seconds: int = 3600,
    ) -> PresignedUpload:
        import boto3

        client = boto3.client(
            "s3",
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
            region_name=self._region,
            endpoint_url=self._endpoint_url,
        )
        url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in_seconds,
            HttpMethod="PUT",
        )
        return PresignedUpload(
            url=url,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=utcnow() + timedelta(seconds=expires_in_seconds),
        )


class OssUploadStorageProvider:
    provider = "oss"

    def __init__(
        self,
        *,
        bucket: str,
        endpoint: str,
        access_key_id: str,
        access_key_secret: str,
    ) -> None:
        self.bucket = bucket
        self._endpoint = endpoint
        self._access_key_id = access_key_id
        self._access_key_secret = access_key_secret

    async def create_presigned_upload(
        self,
        *,
        key: str,
        content_type: str,
        expires_in_seconds: int = 3600,
    ) -> PresignedUpload:
        import oss2

        auth = oss2.Auth(self._access_key_id, self._access_key_secret)
        bucket = oss2.Bucket(auth, self._endpoint, self.bucket)
        url = bucket.sign_url(
            "PUT",
            key,
            expires_in_seconds,
            headers={"Content-Type": content_type},
        )
        return PresignedUpload(
            url=url,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=utcnow() + timedelta(seconds=expires_in_seconds),
        )


def resolve_upload_storage_provider() -> UploadStorageProvider:
    provider = (os.environ.get("UPLOAD_STORAGE_PROVIDER") or "local").lower()
    app_env = (
        os.environ.get("APP_ENV")
        or os.environ.get("ENV")
        or os.environ.get("NODE_ENV")
    )
    is_production = (app_env or "").lower() in {"prod", "production"}
    bucket = os.environ.get("UPLOAD_BUCKET") or os.environ.get("R2_BUCKET_UPLOADS")
    bucket = bucket or os.environ.get("OSS_BUCKET") or "nebutra-uploads"

    if provider == "local":
        if is_production:
            raise UploadStorageUnavailableError(
                "local upload storage is not allowed in production"
            )
        return LocalUploadStorageProvider(
            bucket=bucket,
            base_url=os.environ.get("UPLOAD_LOCAL_BASE_URL")
            or os.environ.get("UPLOAD_HTTP_BASE_URL")
            or "http://localhost:3000",
        )

    if provider in {"s3", "r2"}:
        endpoint = os.environ.get("S3_ENDPOINT")
        region = os.environ.get("AWS_REGION") or "us-east-1"
        access_key_id = os.environ.get("AWS_ACCESS_KEY_ID") or ""
        secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY") or ""
        if provider == "r2":
            account_id = os.environ.get("R2_ACCOUNT_ID")
            endpoint = os.environ.get("R2_ENDPOINT") or (
                f"https://{account_id}.r2.cloudflarestorage.com" if account_id else None
            )
            region = "auto"
            access_key_id = os.environ.get("R2_ACCESS_KEY_ID") or access_key_id
            secret_access_key = (
                os.environ.get("R2_SECRET_ACCESS_KEY") or secret_access_key
            )
        if not access_key_id or not secret_access_key or not bucket:
            raise UploadStorageUnavailableError(
                f"{provider} upload storage credentials are incomplete"
            )
        return S3UploadStorageProvider(
            bucket=bucket,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            region=region,
            endpoint_url=endpoint,
            provider=provider,
        )

    if provider == "oss":
        endpoint = os.environ.get("OSS_ENDPOINT") or ""
        access_key_id = os.environ.get("OSS_ACCESS_KEY_ID") or ""
        access_key_secret = os.environ.get("OSS_ACCESS_KEY_SECRET") or ""
        if not endpoint or not access_key_id or not access_key_secret or not bucket:
            raise UploadStorageUnavailableError(
                "oss upload storage credentials are incomplete"
            )
        return OssUploadStorageProvider(
            bucket=bucket,
            endpoint=endpoint,
            access_key_id=access_key_id,
            access_key_secret=access_key_secret,
        )

    raise UploadStorageUnavailableError(
        f"unsupported upload storage provider: {provider}"
    )
