import { getIdpRuntimeConfig } from "@/lib/oidc-config";

export const dynamic = "force-dynamic";

export function GET() {
  let issuer = "not_configured";

  try {
    issuer = getIdpRuntimeConfig().issuer;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      issuer = "invalid_development_config";
    }
  }

  return Response.json({
    service: "nebutra-idp",
    status: "ok",
    issuer,
    discovery: "/.well-known/openid-configuration",
    legacyDiscovery: "/api/oidc/.well-known/openid-configuration",
  });
}
