export const dynamic = "force-dynamic";

export function GET() {
  const origin = (
    process.env.NEXT_PUBLIC_AUTH_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://auth.nebutra.com"
  ).replace(/\/$/, "");
  return Response.json({
    service: "nebutra-auth-center",
    status: "ok",
    origin,
    role: "login-center",
    idp: process.env.OIDC_ISSUER || "https://sso.nebutra.com",
  });
}
