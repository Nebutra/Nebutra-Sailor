<<<<<<< HEAD
export const dynamic = "force-dynamic";

export function GET() {
  const origin =
    process.env.NEXT_PUBLIC_AUTH_URL || process.env.BETTER_AUTH_URL || "https://auth.nebutra.com";
  return Response.json({
    service: "nebutra-auth-center",
    status: "ok",
    origin: origin.replace(/\/$/, ""),
=======
import { getAuthCenterOrigin } from "@nebutra/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "nebutra-auth-center",
    status: "ok",
    origin: getAuthCenterOrigin(),
>>>>>>> origin/main
    role: "login-center",
    idp: process.env.OIDC_ISSUER || "https://sso.nebutra.com",
  });
}
