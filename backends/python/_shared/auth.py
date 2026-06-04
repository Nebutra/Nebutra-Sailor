"""Service-to-service authentication for Nebutra Python microservices.

Mirrors the TypeScript implementation in packages/iam/auth/src/s2s.ts:
  primary token = short-lived HS256 JWT carrying tenant claims + iat/exp/jti
  legacy token  = HMAC-SHA256 canonical digest, accepted only when opted in

All Python services that receive internal traffic from the gateway must
declare `tenant: TenantContext = Depends(get_tenant)` on their route handlers.
Unauthenticated requests receive an anonymous context — route-level guards
(require_organization, require_auth) enforce authentication requirements.
"""

from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException


@dataclass(frozen=True)
class TenantContext:
    """Verified tenant identity forwarded by the gateway."""

    organization_id: str | None
    user_id: str | None
    role: str | None
    plan: str
    # True when the request carried a valid service token.
    # False = anonymous / public (health probes, unauthenticated dev calls).
    authenticated: bool = False


def _canonical(
    user_id: str | None,
    org_id: str | None,
    role: str | None,
    plan: str | None,
) -> str:
    # Must match canonicalizeServiceTokenContext in s2s.ts
    return ":".join([user_id or "", org_id or "", role or "", plan or ""])


def _verify_legacy_hmac(token: str, canonical: str, secret: str) -> bool:
    if not token or any(char not in "0123456789abcdef" for char in token):
        return False
    expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(token, expected)
    except Exception:
        return False


def _legacy_fallback_allowed() -> bool:
    return os.environ.get("S2S_ALLOW_LEGACY") == "1"


def _claim(payload: dict[str, object], name: str) -> object | None:
    value = payload.get(name)
    return value if value is not None else None


def _verify_jwt(
    token: str,
    secret: str,
    *,
    user_id: str | None,
    organization_id: str | None,
    role: str | None,
    plan: str | None,
) -> bool:
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "jti"]},
        )
    except jwt.PyJWTError:
        return False

    return (
        _claim(payload, "userId") == (user_id or None)
        and _claim(payload, "organizationId") == (organization_id or None)
        and _claim(payload, "role") == (role or None)
        and _claim(payload, "plan") == (plan or None)
    )


async def get_tenant(
    x_service_token: Annotated[str | None, Header()] = None,
    x_organization_id: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
    x_role: Annotated[str | None, Header()] = None,
    x_plan: Annotated[str | None, Header()] = None,
) -> TenantContext:
    """
    FastAPI dependency — inject as: tenant: TenantContext = Depends(get_tenant)

    When x-service-token is present:
      - Verifies short-lived HS256 JWT against SERVICE_SECRET (same as s2s.ts)
      - Raises 401 on invalid token so gateway misconfigurations surface fast
      - Returns a fully populated, authenticated TenantContext

    When x-service-token is absent:
      - Returns an anonymous context (plan=FREE, authenticated=False)
      - Route-level guards (require_organization, require_auth) must reject if needed
    """
    if not x_service_token:
        return TenantContext(
            organization_id=None,
            user_id=None,
            role=None,
            plan="FREE",
            authenticated=False,
        )

    secret = os.environ.get("SERVICE_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="SERVICE_SECRET not configured — service cannot verify internal tokens",
        )

    jwt_valid = _verify_jwt(
        x_service_token,
        secret,
        user_id=x_user_id,
        organization_id=x_organization_id,
        role=x_role,
        plan=x_plan,
    )
    legacy_valid = _legacy_fallback_allowed() and _verify_legacy_hmac(
        x_service_token,
        _canonical(x_user_id, x_organization_id, x_role, x_plan),
        secret,
    )
    if not (jwt_valid or legacy_valid):
        raise HTTPException(status_code=401, detail="invalid_service_token")

    return TenantContext(
        organization_id=x_organization_id or None,
        user_id=x_user_id or None,
        role=x_role or None,
        plan=x_plan or "FREE",
        authenticated=True,
    )


# ── Route guards (composable on top of get_tenant) ────────────────────────────


def require_auth(tenant: TenantContext = Depends(get_tenant)) -> TenantContext:
    if not tenant.user_id:
        raise HTTPException(status_code=401, detail="authentication_required")
    return tenant


def require_organization(tenant: TenantContext = Depends(get_tenant)) -> TenantContext:
    if not tenant.organization_id:
        raise HTTPException(status_code=403, detail="organization_required")
    return tenant
