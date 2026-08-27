/**
 * SSO discovery — domain-only lookup. Same contract as apps/web.
 * Clerk handoff URLs are absolute to the product app (enterprise SSO stays there).
 */

import { NextResponse } from "next/server";
import { applyAuthCors } from "@/lib/cors";
import { resolveAppOrigin } from "@/lib/return-to";
import {
  extractEmailDomain,
  findSsoProvider,
  parseConfiguredSsoProviders,
  toSsoDiscoveryProvider,
} from "@/lib/sso-discovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const identifier = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const domain = extractEmailDomain(identifier);
  if (!domain) {
    return applyAuthCors(request, NextResponse.json({ provider: null }, { status: 200 }));
  }

  const provider = findSsoProvider(domain, parseConfiguredSsoProviders());
  if (!provider) {
    return applyAuthCors(request, NextResponse.json({ provider: null }, { status: 200 }));
  }

  return applyAuthCors(
    request,
    NextResponse.json(
      {
        provider: toSsoDiscoveryProvider(provider, {
          identifier,
          returnUrl: url.searchParams.get("returnUrl") ?? url.searchParams.get("returnTo"),
          loginOrigin: resolveAppOrigin(),
        }),
      },
      { status: 200 },
    ),
  );
}
