const DEFAULT_DEV_OIDC_ISSUER = "http://localhost:3100";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off", ""]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export interface IdpRuntimeConfig {
  issuer: string;
  cookieKeys: string[];
  enableClientCredentials: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  throw new Error(
    `[idp] Invalid boolean value "${value}". Use true/false, yes/no, on/off, or 1/0.`,
  );
}

function parseCookieKeys(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function normalizeIssuer(value: string | undefined, isProduction: boolean): string {
  const rawIssuer = value?.trim();

  if (!rawIssuer) {
    if (isProduction) {
      throw new Error("[idp] OIDC_ISSUER is required in production, e.g. https://sso.nebutra.com.");
    }
    return DEFAULT_DEV_OIDC_ISSUER;
  }

  let issuerUrl: URL;
  try {
    issuerUrl = new URL(rawIssuer);
  } catch {
    throw new Error(`[idp] OIDC_ISSUER must be an absolute URL. Received: ${rawIssuer}`);
  }

  issuerUrl.hash = "";
  issuerUrl.search = "";

  if (isProduction) {
    if (issuerUrl.protocol !== "https:") {
      throw new Error("[idp] OIDC_ISSUER must use https:// in production.");
    }

    if (LOCAL_HOSTS.has(issuerUrl.hostname)) {
      throw new Error(
        "[idp] OIDC_ISSUER cannot point at localhost or a wildcard host in production.",
      );
    }

    if (issuerUrl.pathname !== "/") {
      throw new Error(
        "[idp] Production OIDC_ISSUER must be the origin only. Use https://sso.nebutra.com, not a path-prefixed issuer.",
      );
    }
  }

  return issuerUrl.toString().replace(/\/$/, "");
}

export function getIdpRuntimeConfig(env: NodeJS.ProcessEnv = process.env): IdpRuntimeConfig {
  const isProduction = env.NODE_ENV === "production";

  return {
    issuer: normalizeIssuer(env.OIDC_ISSUER, isProduction),
    cookieKeys: parseCookieKeys(env.OIDC_COOKIE_KEYS),
    enableClientCredentials: parseBoolean(env.OIDC_ENABLE_CLIENT_CREDENTIALS, false),
  };
}
