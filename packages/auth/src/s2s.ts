import { createHmac, timingSafeEqual } from "node:crypto";

export interface ServiceTokenClaims {
  organizationId?: string;
  userId?: string;
  role?: string;
  plan?: string;
  issuedAt?: number;
  expiresAt?: number;
}

export interface SignServiceTokenOptions {
  expiresInSeconds?: number;
  now?: Date;
}

type ServiceTokenPayload = ServiceTokenClaims & {
  exp: number;
  iat: number;
};

const DEFAULT_EXPIRES_IN_SECONDS = 5 * 60;

function encodeBase64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeBase64Url<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

function requireSecret(secret: string): void {
  if (!secret) {
    throw new Error("[auth] SERVICE_SECRET is required for service token operations");
  }
}

export function signServiceToken(
  claims: ServiceTokenClaims,
  secret: string,
  options: SignServiceTokenOptions = {},
): string {
  requireSecret(secret);

  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const payload: ServiceTokenPayload = {
    ...claims,
    iat: claims.issuedAt ?? now,
    exp: claims.expiresAt ?? now + (options.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS),
  };

  const header = encodeBase64Url({ alg: "HS256", typ: "JWT" });
  const body = encodeBase64Url(payload);
  const signingInput = `${header}.${body}`;

  return `${signingInput}.${sign(signingInput, secret)}`;
}

export function verifyServiceToken(
  token: string,
  secret: string,
  options: { now?: Date } = {},
): ServiceTokenPayload {
  requireSecret(secret);

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new Error("[auth] Invalid service token shape");
  }

  const expectedSignature = sign(`${header}.${body}`, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("[auth] Invalid service token signature");
  }

  const payload = decodeBase64Url<ServiceTokenPayload>(body);
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);

  if (payload.exp <= now) {
    throw new Error("[auth] Service token expired");
  }

  return payload;
}
