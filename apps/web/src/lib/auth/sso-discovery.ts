import { sanitizeReturnUrl } from "@nebutra/auth";
import { z } from "zod";

export const CLERK_ENTERPRISE_SSO_PATH = "/sign-in/sso";

const EMAIL_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const internalPathSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"));

export const ssoProviderSchema = z
  .object({
    domain: z.string().trim().toLowerCase().regex(EMAIL_DOMAIN_PATTERN),
    id: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    type: z.enum(["saml", "oidc"]),
    provider: z.enum(["clerk", "generic"]).default("generic"),
    loginUrl: internalPathSchema.optional(),
    allowSubdomains: z.boolean().default(false),
  })
  .superRefine((provider, ctx) => {
    if (provider.provider === "generic" && !provider.loginUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "generic SSO providers must define loginUrl",
        path: ["loginUrl"],
      });
    }
  });

export type SsoProvider = z.infer<typeof ssoProviderSchema>;

export interface SsoDiscoveryProvider {
  domain: string;
  id: string;
  name: string;
  type: "saml" | "oidc";
  provider: "clerk" | "generic";
  loginUrl: string;
}

export function parseConfiguredSsoProviders(
  raw = process.env.AUTH_SSO_DISCOVERY_PROVIDERS,
): SsoProvider[] {
  if (!raw) return [];

  try {
    const parsed = z.array(ssoProviderSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function isValidSsoProviderConfig(raw: string | undefined): boolean {
  if (!raw) return true;

  try {
    return z.array(ssoProviderSchema).safeParse(JSON.parse(raw)).success;
  } catch {
    return false;
  }
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || normalized.includes(" ")) return null;

  const parts = normalized.split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1];
  if (!domain || !EMAIL_DOMAIN_PATTERN.test(domain)) return null;
  return domain;
}

export function findSsoProvider(
  domain: string,
  providers: readonly SsoProvider[],
): SsoProvider | null {
  return (
    providers.find((provider) => {
      if (domain === provider.domain) return true;
      return provider.allowSubdomains && domain.endsWith(`.${provider.domain}`);
    }) ?? null
  );
}

export function buildSsoLoginUrl(
  provider: SsoProvider,
  options: { identifier: string; returnUrl: string | null },
): string {
  const loginUrl = provider.loginUrl ?? CLERK_ENTERPRISE_SSO_PATH;
  const url = new URL(loginUrl, "https://placeholder.invalid");

  if (provider.provider === "clerk") {
    url.searchParams.set("provider", provider.id);
    url.searchParams.set("providerName", provider.name);
    url.searchParams.set("identifier", options.identifier);
  }

  const safeReturnUrl = sanitizeReturnUrl(options.returnUrl, { fallback: "" });
  if (safeReturnUrl) {
    url.searchParams.set("returnUrl", safeReturnUrl);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function toSsoDiscoveryProvider(
  provider: SsoProvider,
  options: { identifier: string; returnUrl: string | null },
): SsoDiscoveryProvider {
  return {
    domain: provider.domain,
    id: provider.id,
    name: provider.name,
    type: provider.type,
    provider: provider.provider,
    loginUrl: buildSsoLoginUrl(provider, options),
  };
}
