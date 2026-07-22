import { getAuthCenterOrigin } from "@nebutra/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "nebutra-auth-center",
    status: "ok",
    origin: getAuthCenterOrigin(),
    role: "login-center",
    idp: process.env.OIDC_ISSUER || "https://sso.nebutra.com",
  });
}
