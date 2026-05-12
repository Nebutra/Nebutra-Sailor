"""Service-to-service authentication for Nebutra Python microservices.

Mirrors the TypeScript implementation in packages/iam/auth/src/s2s.ts exactly:
  canonical = f"{user_id}:{org_id}:{role}:{plan}"  (empty string for missing fields)
  token     = HMAC-SHA256(canonical, SERVICE_SECRET).hexdigest()

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

from fastapi import Depends, Header, HTTPException


@dataclass(frozen=True)
class TenantContext:
    """Verified tenant identity forwarded by the gateway."""

    organization_id: str | None
    user_id: str | None
    role: str | None
    plan: str
    # True when the request carried a valid HMAC service token.
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


def _verify_hmac(token: str, canonical: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(token, expected)
    except Exception:
        return False


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
      - Verifies HMAC against SERVICE_SECRET (same algorithm as s2s.ts)
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

    canonical = _canonical(x_user_id, x_organization_id, x_role, x_plan)
    if not _verify_hmac(x_service_token, canonical, secret):
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
