import type { OAuth2Tokens, OAuth2UserInfo } from "@better-auth/core/oauth2";
import { logger } from "@nebutra/logger";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import type { BetterAuthPlugin } from "better-auth/types";

const FEISHU_PROVIDER_ID = "feishu";
const DEFAULT_FEISHU_OAUTH_BASE_URL = "https://open.feishu.cn";
const DEFAULT_FEISHU_AUTHORIZATION_PATH = "/open-apis/authen/v1/index";
const DEFAULT_FEISHU_TOKEN_PATH = "/open-apis/authen/v2/oauth/token";
const DEFAULT_FEISHU_USER_INFO_PATH = "/open-apis/authen/v1/user_info";

type EnvLike = Record<string, string | undefined>;
type FetchLike = typeof fetch;

interface FeishuOAuthOptions {
  env?: EnvLike;
  fetch?: FetchLike;
}

interface FeishuOAuthEndpoints {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

type FeishuOAuthRecord = Record<string, unknown>;

export type FeishuOAuthUserInfo = OAuth2UserInfo & {
  openId?: string;
  unionId?: string;
  userId?: string;
  tenantKey?: string;
  raw?: FeishuOAuthRecord;
};

export function isFeishuOAuthConfigured(env: EnvLike = process.env): boolean {
  return Boolean(env.FEISHU_APP_ID && env.FEISHU_APP_SECRET);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildEndpoint(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ""), ensureTrailingSlash(baseUrl)).toString();
}

function buildAuthorizationUrlWithAppId(authorizationUrl: string, appId: string): string {
  const url = new URL(authorizationUrl);
  url.searchParams.set("app_id", appId);
  return url.toString();
}

export function resolveFeishuOAuthEndpoints(env: EnvLike = process.env): FeishuOAuthEndpoints {
  const baseUrl = env.FEISHU_OAUTH_BASE_URL ?? DEFAULT_FEISHU_OAUTH_BASE_URL;
  return {
    authorizationUrl:
      env.FEISHU_AUTHORIZATION_URL ?? buildEndpoint(baseUrl, DEFAULT_FEISHU_AUTHORIZATION_PATH),
    tokenUrl: env.FEISHU_TOKEN_URL ?? buildEndpoint(baseUrl, DEFAULT_FEISHU_TOKEN_PATH),
    userInfoUrl: env.FEISHU_USER_INFO_URL ?? buildEndpoint(baseUrl, DEFAULT_FEISHU_USER_INFO_PATH),
  };
}

function asRecord(value: unknown): FeishuOAuthRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as FeishuOAuthRecord)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function dateFromExpiresIn(value: unknown, now = Date.now()): Date | undefined {
  const seconds = numberValue(value);
  if (!seconds || seconds <= 0) return undefined;
  return new Date(now + seconds * 1000);
}

function splitScopes(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const scopes = value.map(stringValue).filter((scope): scope is string => Boolean(scope));
    return scopes.length > 0 ? scopes : undefined;
  }
  const scopes = stringValue(value)
    ?.split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes && scopes.length > 0 ? scopes : undefined;
}

function extractFeishuData(payload: unknown, context: "token" | "user_info"): FeishuOAuthRecord {
  const record = asRecord(payload);
  if (!record) throw new Error(`Feishu ${context} response must be an object.`);

  const code = record.code;
  const hasWrappedCode = code !== undefined && code !== null;
  const isSuccessCode = code === 0 || code === "0";
  if (hasWrappedCode && !isSuccessCode) {
    const message = stringValue(record.msg) ?? stringValue(record.message) ?? String(code);
    throw new Error(`Feishu ${context} request failed: ${message}`);
  }

  return asRecord(record.data) ?? record;
}

export function normalizeFeishuOAuthTokens(payload: unknown, now = Date.now()): OAuth2Tokens {
  const data = extractFeishuData(payload, "token");
  const accessToken = stringValue(data.access_token) ?? stringValue(data.accessToken);
  if (!accessToken) throw new Error("Feishu token response is missing access_token.");

  const refreshToken = stringValue(data.refresh_token) ?? stringValue(data.refreshToken);
  const accessTokenExpiresAt = dateFromExpiresIn(data.expires_in ?? data.expiresIn, now);
  const refreshTokenExpiresAt = dateFromExpiresIn(
    data.refresh_expires_in ?? data.refreshExpiresIn,
    now,
  );
  const scopes = splitScopes(data.scope ?? data.scopes);

  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    tokenType: stringValue(data.token_type) ?? stringValue(data.tokenType) ?? "Bearer",
    ...(accessTokenExpiresAt ? { accessTokenExpiresAt } : {}),
    ...(refreshTokenExpiresAt ? { refreshTokenExpiresAt } : {}),
    ...(scopes ? { scopes } : {}),
    raw: data,
  };
}

export function normalizeFeishuUserInfo(payload: unknown): FeishuOAuthUserInfo | null {
  const data = extractFeishuData(payload, "user_info");
  const user = asRecord(data.user) ?? data;

  const unionId = stringValue(user.union_id) ?? stringValue(user.unionId);
  const openId = stringValue(user.open_id) ?? stringValue(user.openId);
  const userId = stringValue(user.user_id) ?? stringValue(user.userId);
  const id = unionId ?? openId ?? userId ?? stringValue(user.sub);
  if (!id) return null;

  const email = stringValue(user.email);
  const name =
    stringValue(user.name) ??
    stringValue(user.en_name) ??
    stringValue(user.enName) ??
    stringValue(user.nickname) ??
    email ??
    id;
  const image =
    stringValue(user.avatar_url) ??
    stringValue(user.avatarUrl) ??
    stringValue(user.avatar_thumb) ??
    stringValue(user.avatar_middle) ??
    stringValue(user.avatar_big);
  const tenantKey = stringValue(user.tenant_key) ?? stringValue(user.tenantKey);

  return {
    id,
    name,
    email,
    emailVerified: Boolean(email),
    ...(image ? { image } : {}),
    ...(openId ? { openId } : {}),
    ...(unionId ? { unionId } : {}),
    ...(userId ? { userId } : {}),
    ...(tenantKey ? { tenantKey } : {}),
    raw: user,
  };
}

function resolveFeishuScopes(env: EnvLike): string[] {
  return splitScopes(env.FEISHU_OAUTH_SCOPES) ?? [];
}

function resolveAllowedTenantKeys(env: EnvLike): Set<string> {
  return new Set(splitScopes(env.FEISHU_ALLOWED_TENANT_KEYS) ?? []);
}

function assertAllowedTenant(user: FeishuOAuthUserInfo, env: EnvLike): void {
  const allowedTenantKeys = resolveAllowedTenantKeys(env);
  if (allowedTenantKeys.size === 0) return;
  if (!user.tenantKey || !allowedTenantKeys.has(user.tenantKey)) {
    throw new Error("Feishu user tenant is not allowed for this Nebutra deployment.");
  }
}

async function readJsonResponse(
  response: Response,
  context: "token" | "user_info",
): Promise<unknown> {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      stringValue(record?.msg) ??
      stringValue(record?.message) ??
      `${response.status} ${response.statusText}`.trim();
    throw new Error(`Feishu ${context} HTTP request failed: ${message}`);
  }
  return payload;
}

export function buildFeishuGenericOAuthConfig(
  options: FeishuOAuthOptions = {},
): GenericOAuthConfig | null {
  const env = options.env ?? process.env;
  if (!isFeishuOAuthConfigured(env)) return null;

  const fetcher = options.fetch ?? fetch;
  const endpoints = resolveFeishuOAuthEndpoints(env);
  const clientId = env.FEISHU_APP_ID;
  const clientSecret = env.FEISHU_APP_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    providerId: FEISHU_PROVIDER_ID,
    authorizationUrl: buildAuthorizationUrlWithAppId(endpoints.authorizationUrl, clientId),
    tokenUrl: endpoints.tokenUrl,
    userInfoUrl: endpoints.userInfoUrl,
    clientId,
    clientSecret,
    scopes: resolveFeishuScopes(env),
    ...(env.FEISHU_REDIRECT_URI ? { redirectURI: env.FEISHU_REDIRECT_URI } : {}),
    getToken: async ({ code, redirectURI }) => {
      const response = await fetcher(endpoints.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectURI,
        }),
      });
      return normalizeFeishuOAuthTokens(await readJsonResponse(response, "token"));
    },
    getUserInfo: async (tokens) => {
      if (!tokens.accessToken) throw new Error("Feishu user_info requires an access token.");
      const response = await fetcher(endpoints.userInfoUrl, {
        method: "GET",
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      });
      const user = normalizeFeishuUserInfo(await readJsonResponse(response, "user_info"));
      if (!user) return null;
      assertAllowedTenant(user, env);
      return user;
    },
    mapProfileToUser: (profile) => {
      const email = stringValue(profile.email);
      const image = stringValue(profile.image);
      return {
        name: stringValue(profile.name) ?? email ?? "Feishu User",
        ...(email ? { email } : {}),
        ...(image ? { image } : {}),
      };
    },
  };
}

export async function loadBetterAuthFeishuOAuthPlugin(
  options: FeishuOAuthOptions = {},
): Promise<BetterAuthPlugin | undefined> {
  const config = buildFeishuGenericOAuthConfig(options);
  if (!config) return undefined;

  try {
    const pluginModule = (await import("better-auth/plugins")) as {
      genericOAuth?: (options: { config: GenericOAuthConfig[] }) => BetterAuthPlugin;
    };
    if (!pluginModule.genericOAuth) return undefined;
    return pluginModule.genericOAuth({ config: [config] });
  } catch (error) {
    logger.warn("Better Auth: generic OAuth plugin not available — Feishu SSO will not mount.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
