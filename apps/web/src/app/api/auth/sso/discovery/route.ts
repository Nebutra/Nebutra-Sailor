/**
 * SSO discovery — domain-only lookup, returns whether a SAML/OIDC IdP is
 * mapped to the email's domain. Anti-enumeration by design: the response
 * does NOT depend on whether any user with that email exists, only on the
 * domain → IdP mapping (which is public information for enterprise
 * customers anyway).
 *
 * Current implementation is a stub returning `{ provider: null }` until a
 * SSO provider (WorkOS / Okta / Auth0) is wired. Sign-in forms can call
 * this on email blur to surface a "Continue with {Provider}" branch — when
 * the stub returns null, the normal flow continues.
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ provider: null }, { status: 200 });
  }

  // Domain-keyed lookup goes here once SSO is wired (WorkOS / Okta / Auth0).
  // Today the deployment has no SSO mapping configured, so every request
  // returns null. Anti-enumeration: this branch does not differentiate
  // between "domain has no SSO" and "domain has SSO but the email is
  // unknown" — only domain mappings matter.
  return NextResponse.json({ provider: null }, { status: 200 });
}
