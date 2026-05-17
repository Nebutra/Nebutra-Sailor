import { OAuth2Client } from "google-auth-library";
import { encode, type JWT } from "next-auth/jwt";
import { buildSessionHintCookie } from "@/lib/session-hint";

const GOOGLE_CSRF_COOKIE = "g_csrf_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_HINT_MAX_AGE = 60 * 60 * 24 * 30;
const NEXTAUTH_SESSION_COOKIE = "authjs.session-token";
const SECURE_NEXTAUTH_SESSION_COOKIE = "__Secure-authjs.session-token";

export interface GoogleOneTapUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

interface HandleGoogleOneTapOptions {
  verifyIdToken?: (credential: string) => Promise<GoogleOneTapUser>;
}

interface SessionCookieInput {
  maxAge?: number;
  requestUrl: URL;
  secret: string;
  user: GoogleOneTapUser;
}

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function isHttps(url: URL): boolean {
  return url.protocol === "https:";
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required for Google One Tap sessions.");
  }
  return secret;
}

function normalizeOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  try {
    return new URL(origin).origin;
  } catch {
    return undefined;
  }
}

function addOrigin(origins: Set<string>, origin: string | undefined): void {
  const normalized = normalizeOrigin(origin);
  if (normalized) origins.add(normalized);
}

export function getGoogleOneTapAllowedOrigins(requestUrl: URL): string[] {
  const origins = new Set<string>();
  addOrigin(origins, requestUrl.origin);
  addOrigin(origins, process.env.NEXT_PUBLIC_SITE_URL);
  addOrigin(origins, process.env.NEBUTRA_LANDING_ORIGIN);
  return Array.from(origins).sort();
}

export function assertGoogleOneTapOrigin(request: Request): void {
  const requestUrl = new URL(request.url);
  const origin = normalizeOrigin(request.headers.get("origin") ?? undefined);
  if (!origin) {
    throw new Error("Origin header is required for Google One Tap.");
  }
  const allowedOrigins = getGoogleOneTapAllowedOrigins(requestUrl);
  if (!allowedOrigins.includes(origin)) {
    throw new Error("Origin is not allowed for Google One Tap.");
  }
}

export async function verifyGoogleOneTapCsrf(request: Request): Promise<string> {
  const form = await request.formData();
  const csrfCookie = getCookie(request, GOOGLE_CSRF_COOKIE);
  const csrfBody = form.get(GOOGLE_CSRF_COOKIE);
  if (!csrfCookie || typeof csrfBody !== "string" || !csrfBody) {
    throw new Error("Google One Tap CSRF token missing.");
  }
  if (csrfCookie !== csrfBody) {
    throw new Error("Google One Tap CSRF token mismatch.");
  }

  const credential = form.get("credential");
  if (typeof credential !== "string" || !credential) {
    throw new Error("Google One Tap credential missing.");
  }
  return credential;
}

export async function verifyGoogleOneTapIdToken(credential: string): Promise<GoogleOneTapUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required for Google One Tap token verification.");
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google One Tap token is missing required identity claims.");
  }
  if (payload.email_verified !== true) {
    throw new Error("Google One Tap email is not verified.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.picture ? { picture: payload.picture } : {}),
  };
}

export async function buildGoogleOneTapSessionCookie(input: SessionCookieInput): Promise<string> {
  const secure = isHttps(input.requestUrl);
  const cookieName = secure ? SECURE_NEXTAUTH_SESSION_COOKIE : NEXTAUTH_SESSION_COOKIE;
  const token: JWT = {
    sub: input.user.sub,
    email: input.user.email,
    name: input.user.name ?? input.user.email,
    picture: input.user.picture,
    provider: "google",
    googleSub: input.user.sub,
  };
  const value = await encode({
    token,
    secret: input.secret,
    salt: cookieName,
    maxAge: input.maxAge ?? SESSION_MAX_AGE,
  });
  const parts = [
    `${cookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${input.maxAge ?? SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function buildDashboardRedirect(requestUrl: URL): URL {
  return new URL("/dashboard", requestUrl.origin);
}

export async function handleGoogleOneTapSignIn(
  request: Request,
  options: HandleGoogleOneTapOptions = {},
): Promise<Response> {
  assertGoogleOneTapOrigin(request);
  const credential = await verifyGoogleOneTapCsrf(request);
  const user = await (options.verifyIdToken ?? verifyGoogleOneTapIdToken)(credential);
  const requestUrl = new URL(request.url);
  const response = new Response(null, {
    status: 303,
    headers: { location: buildDashboardRedirect(requestUrl).toString() },
  });
  response.headers.append(
    "Set-Cookie",
    await buildGoogleOneTapSessionCookie({
      requestUrl,
      secret: getAuthSecret(),
      user,
    }),
  );
  response.headers.append("Set-Cookie", buildSessionHintCookie("1", SESSION_HINT_MAX_AGE));
  return response;
}
