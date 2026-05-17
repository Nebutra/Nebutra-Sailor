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
 *     "loginUrl": "/api/auth/sso/acme-okta"
 *   }
 * ]
 */

import { sanitizeReturnUrl } from "@nebutra/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const EMAIL_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const ssoProviderSchema = z.object({
  domain: z.string().trim().toLowerCase().regex(EMAIL_DOMAIN_PATTERN),
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["saml", "oidc"]),
  loginUrl: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith("/") && !value.startsWith("//")),
});

type SsoProvider = z.infer<typeof ssoProviderSchema>;

function parseConfiguredProviders(): SsoProvider[] {
  const raw = process.env.AUTH_SSO_DISCOVERY_PROVIDERS;
  if (!raw) return [];

  try {
    const parsed = z.array(ssoProviderSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function extractEmailDomain(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || normalized.includes(" ") || !normalized.includes("@")) return null;

  const [, domain] = normalized.split("@");
  if (!domain || !EMAIL_DOMAIN_PATTERN.test(domain)) return null;
  return domain;
}

function findProvider(domain: string, providers: readonly SsoProvider[]): SsoProvider | null {
  return (
    providers.find(
      (provider) => domain === provider.domain || domain.endsWith(`.${provider.domain}`),
    ) ?? null
  );
}

function buildLoginUrl(loginUrl: string, returnUrl: string | null): string {
  const safeReturnUrl = sanitizeReturnUrl(returnUrl, { fallback: "" });
  if (!safeReturnUrl) return loginUrl;

  const url = new URL(loginUrl, "https://placeholder.invalid");
  url.searchParams.set("returnUrl", safeReturnUrl);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = extractEmailDomain(url.searchParams.get("email"));
  if (!domain) {
    return NextResponse.json({ provider: null }, { status: 200 });
  }

  const provider = findProvider(domain, parseConfiguredProviders());
  if (!provider) return NextResponse.json({ provider: null }, { status: 200 });

  return NextResponse.json(
    {
      provider: {
        domain: provider.domain,
        id: provider.id,
        name: provider.name,
        type: provider.type,
        loginUrl: buildLoginUrl(provider.loginUrl, url.searchParams.get("returnUrl")),
      },
    },
    { status: 200 },
  );
}
