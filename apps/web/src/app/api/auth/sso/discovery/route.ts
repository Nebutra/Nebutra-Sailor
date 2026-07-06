/**
 * SSO discovery — domain-only lookup, returns whether a SAML/OIDC IdP is
 * mapped to the email's domain. Anti-enumeration by design: the response
 * does NOT depend on whether any user with that email exists, only on the
 * domain → IdP mapping (which is public information for enterprise
 * customers anyway).
 *
 * Operators can configure discovery with `AUTH_SSO_DISCOVERY_PROVIDERS`:
 * [
 *   {
 *     "domain": "acme.com",
 *     "id": "acme-okta",
 *     "name": "Acme Okta",
 *     "type": "saml",
 *     "provider": "clerk",
 *     "allowSubdomains": false
 *   }
 * ]
 */

import { NextResponse } from "next/server";
import {
  extractEmailDomain,
  findSsoProvider,
  parseConfiguredSsoProviders,
  toSsoDiscoveryProvider,
} from "@/lib/auth/sso-discovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const identifier = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const domain = extractEmailDomain(identifier);
  if (!domain) {
    return NextResponse.json({ provider: null }, { status: 200 });
  }

  const provider = findSsoProvider(domain, parseConfiguredSsoProviders());
  if (!provider) return NextResponse.json({ provider: null }, { status: 200 });

  return NextResponse.json(
    {
      provider: toSsoDiscoveryProvider(provider, {
        identifier,
        returnUrl: url.searchParams.get("returnUrl"),
      }),
    },
    { status: 200 },
  );
}
