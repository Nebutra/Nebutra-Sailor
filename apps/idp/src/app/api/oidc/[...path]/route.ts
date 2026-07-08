/**
 * OIDC Catch-All Route Handler
 *
 * Mounts oidc-provider on /api/oidc/* which serves all standard endpoints:
 *
 * GET  /api/oidc/.well-known/openid-configuration  → Discovery
 * GET  /api/oidc/auth                               → Authorization
 * POST /api/oidc/token                              → Token exchange
 * GET  /api/oidc/userinfo                           → UserInfo
 * GET  /api/oidc/jwks                               → JWKS
 * POST /api/oidc/token/revocation                   → Revocation
 * POST /api/oidc/token/introspection                → Introspection
 */

import type { NextRequest } from "next/server";
import { handleOIDC } from "@/lib/oidc-route";

// Force dynamic rendering — OIDC routes require database/Redis at runtime
export const dynamic = "force-dynamic";

function handleLegacyOIDC(req: NextRequest): Promise<Response> {
  return handleOIDC(req, { mountPath: "/api/oidc" });
}

export const GET = handleLegacyOIDC;
export const POST = handleLegacyOIDC;
export const PUT = handleLegacyOIDC;
export const DELETE = handleLegacyOIDC;
