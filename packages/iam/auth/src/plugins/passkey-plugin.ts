/**
 * Custom Better Auth passkey plugin (WebAuthn) — backed by @simplewebauthn.
 *
 * The official `better-auth/plugins/passkey` is not yet shipped in
 * better-auth 1.5.x's `exports` map. This plugin fills the gap using the
 * battle-tested `@simplewebauthn/server` (Yubico-maintained) for ceremony
 * crypto, while persisting credentials into the existing `BAPasskey` table
 * (`auth.passkey`) already present in the Prisma schema.
 *
 * Endpoints (mounted under Better Auth's basePath, default `/api/auth`):
 *   POST  /passkey/register/options      session required; emits challenge cookie
 *   POST  /passkey/register/verify       session required; persists Authenticator
 *   POST  /passkey/authenticate/options  anonymous; supports Conditional UI
 *   POST  /passkey/authenticate/verify   anonymous; mints session via Better Auth
 *   GET   /passkey/list                  session required; list current user's passkeys
 *   POST  /passkey/revoke                session required; delete by id
 *
 * Challenge transport: httpOnly Lax cookie (5 minute TTL). This is the
 * `@simplewebauthn` docs' recommended pattern for browser-only ceremonies —
 * cheaper than a new DB table and naturally bound to the browser session.
 *
 * Session minting: post-verify we call Better Auth's internal session
 * adapter and Better Auth's own `setSessionCookie` helper so the resulting
 * cookie is signed and shaped identically to a password-flow session.
 */

import { createAuthEndpoint } from "@better-auth/core/api";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth/types";
import { z } from "zod";

const REGISTER_CHALLENGE_COOKIE = "__nebutra_passkey_reg_challenge";
const AUTH_CHALLENGE_COOKIE = "__nebutra_passkey_auth_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;

export interface PasskeyPluginOptions {
  /** Display name shown in OS passkey UI (e.g. "Nebutra"). */
  rpName: string;
  /** Relying-party ID — apex domain (e.g. "nebutra.com" or "localhost" in dev). */
  rpID: string;
  /** Allowed origin(s) for ceremony binding (e.g. "https://nebutra.com"). */
  origin: string | string[];
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function toBase64URL(input: Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

function fromBase64URL(input: string): Uint8Array {
  return new Uint8Array(Buffer.from(input, "base64url"));
}

// SimpleWebAuthn types require `Uint8Array<ArrayBuffer>` (not the wider
// `Uint8Array<ArrayBufferLike>` Node's `Buffer` produces). Copy the bytes
// into a fresh `ArrayBuffer`-backed view.
function toArrayBufferU8(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out as Uint8Array<ArrayBuffer>;
}

// Cookie helpers take `any` ctx — Better Auth's endpoint context type is
// heavily generic and the cookie surface (`request`, `headers`, `setCookie`)
// is uniform enough that erasure here is worth less ceremony than chasing
// every conditional/optional property under `exactOptionalPropertyTypes`.

function readChallengeCookie(ctx: any, name: string): string | null {
  const cookieHeader = ctx.request?.headers?.get?.("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(cookieHeader);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function setChallengeCookie(ctx: any, name: string, value: string) {
  if (typeof ctx.setCookie === "function") {
    ctx.setCookie(name, value, {
      maxAge: CHALLENGE_TTL_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    return;
  }
  const cookieValue = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${CHALLENGE_TTL_SECONDS}; HttpOnly; SameSite=Lax; Secure`;
  ctx.headers?.append?.("Set-Cookie", cookieValue);
}

function clearChallengeCookie(ctx: any, name: string) {
  if (typeof ctx.setCookie === "function") {
    ctx.setCookie(name, "", { maxAge: 0, path: "/" });
    return;
  }
  const cookieValue = `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;
  ctx.headers?.append?.("Set-Cookie", cookieValue);
}

function parseTransports(value: string | null): AuthenticatorTransportFuture[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean) as AuthenticatorTransportFuture[];
}

/* ─── plugin ───────────────────────────────────────────────────────────── */

export const passkey = (options: PasskeyPluginOptions): BetterAuthPlugin => {
  const { rpName, rpID, origin } = options;

  return {
    id: "nebutra-passkey",

    endpoints: {
      /* ── 1. begin registration (session required) ─────────────────── */
      generatePasskeyRegistrationOptions: createAuthEndpoint(
        "/passkey/register/options",
        {
          method: "POST",
          body: z.object({ name: z.string().min(1).max(80).optional() }).optional(),
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user;
          const db = getSystemDb();

          const existing = await db.bAPasskey.findMany({
            where: { userId: user.id },
            select: { credentialID: true, transports: true },
          });

          const opts = await generateRegistrationOptions({
            rpName,
            rpID,
            userName: user.email ?? user.id,
            userID: toArrayBufferU8(new TextEncoder().encode(user.id)),
            attestationType: "none",
            excludeCredentials: existing.map((c) => ({
              id: c.credentialID,
              transports: parseTransports(c.transports),
            })),
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
            },
          });

          setChallengeCookie(ctx, REGISTER_CHALLENGE_COOKIE, opts.challenge);
          return ctx.json(opts);
        },
      ),

      /* ── 2. finish registration (session required) ────────────────── */
      verifyPasskeyRegistration: createAuthEndpoint(
        "/passkey/register/verify",
        {
          method: "POST",
          body: z.object({
            response: z.any() as z.ZodType<RegistrationResponseJSON>,
            name: z.string().min(1).max(80).optional(),
          }),
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user;
          const expectedChallenge = readChallengeCookie(ctx, REGISTER_CHALLENGE_COOKIE);
          if (!expectedChallenge) {
            return ctx.json({ error: "missing_challenge" }, { status: 400 });
          }

          try {
            const verification = await verifyRegistrationResponse({
              response: ctx.body.response,
              expectedChallenge,
              expectedOrigin: origin,
              expectedRPID: rpID,
              requireUserVerification: false,
            });

            if (!verification.verified || !verification.registrationInfo) {
              clearChallengeCookie(ctx, REGISTER_CHALLENGE_COOKIE);
              return ctx.json({ error: "verification_failed" }, { status: 400 });
            }

            const info = verification.registrationInfo;
            const db = getSystemDb();
            await db.bAPasskey.create({
              data: {
                userId: user.id,
                credentialID: info.credential.id,
                publicKey: toBase64URL(info.credential.publicKey),
                counter: info.credential.counter,
                deviceType: info.credentialDeviceType,
                backedUp: info.credentialBackedUp,
                transports: info.credential.transports?.join(",") ?? null,
                name: ctx.body.name ?? null,
              },
            });

            clearChallengeCookie(ctx, REGISTER_CHALLENGE_COOKIE);
            return ctx.json({ verified: true });
          } catch (error) {
            logger.warn("Passkey registration verification threw", {
              error: error instanceof Error ? error.message : String(error),
            });
            clearChallengeCookie(ctx, REGISTER_CHALLENGE_COOKIE);
            return ctx.json({ error: "verification_failed" }, { status: 400 });
          }
        },
      ),

      /* ── 3. begin authentication (anonymous; Conditional UI capable) ── */
      generatePasskeyAuthenticationOptions: createAuthEndpoint(
        "/passkey/authenticate/options",
        {
          method: "POST",
          body: z.object({ email: z.string().email().optional() }).optional(),
          requireHeaders: true,
        },
        async (ctx) => {
          const email = ctx.body?.email;
          const db = getSystemDb();

          let allowCredentials: Array<{
            id: string;
            transports?: AuthenticatorTransportFuture[];
          }> = [];

          if (email) {
            const user = await db.authUser.findUnique({
              where: { email },
              include: {
                baPasskeys: { select: { credentialID: true, transports: true } },
              },
            });
            allowCredentials =
              user?.baPasskeys.map((c) => ({
                id: c.credentialID,
                transports: parseTransports(c.transports),
              })) ?? [];
          }

          const opts = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            userVerification: "preferred",
            timeout: 60_000,
          });

          setChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE, opts.challenge);
          return ctx.json(opts);
        },
      ),

      /* ── 4. finish authentication — mints Better Auth session ───────── */
      verifyPasskey: createAuthEndpoint(
        "/passkey/authenticate/verify",
        {
          method: "POST",
          body: z.object({
            response: z.any() as z.ZodType<AuthenticationResponseJSON>,
          }),
          requireHeaders: true,
        },
        async (ctx) => {
          const expectedChallenge = readChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
          if (!expectedChallenge) {
            return ctx.json({ error: "missing_challenge" }, { status: 400 });
          }

          const responsePayload = ctx.body.response;
          const credentialID = responsePayload.id;
          const db = getSystemDb();
          const stored = await db.bAPasskey.findUnique({
            where: { credentialID },
            include: { user: true },
          });

          if (!stored) {
            clearChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
            return ctx.json({ error: "unknown_credential" }, { status: 401 });
          }

          try {
            const verification = await verifyAuthenticationResponse({
              response: responsePayload,
              expectedChallenge,
              expectedOrigin: origin,
              expectedRPID: rpID,
              requireUserVerification: false,
              credential: {
                id: stored.credentialID,
                publicKey: toArrayBufferU8(fromBase64URL(stored.publicKey)),
                counter: stored.counter,
                transports: parseTransports(stored.transports),
              },
            });

            if (!verification.verified) {
              clearChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
              return ctx.json({ error: "verification_failed" }, { status: 401 });
            }

            await db.bAPasskey.update({
              where: { credentialID },
              data: { counter: verification.authenticationInfo.newCounter },
            });

            // Mint a Better Auth session — same path two-factor / magic-link take.
            const newSession = await ctx.context.internalAdapter.createSession(
              stored.user.id,
              false,
              undefined,
            );
            if (!newSession) {
              clearChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
              return ctx.json({ error: "session_failed" }, { status: 500 });
            }

            // setSessionCookie's `user` requires non-null email/name; the
            // AuthUser row carries them as nullable. Better Auth's signed
            // cookie only persists the user ID — the shape mismatch is
            // cosmetic — so we coerce here without lying about real values.
            await setSessionCookie(ctx as any, {
              session: newSession,
              user: stored.user as unknown as Parameters<typeof setSessionCookie>[1]["user"],
            });

            clearChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
            return ctx.json({
              verified: true,
              token: newSession.token,
              user: {
                id: stored.user.id,
                email: stored.user.email,
                name: stored.user.name,
              },
            });
          } catch (error) {
            logger.warn("Passkey authentication verification threw", {
              error: error instanceof Error ? error.message : String(error),
            });
            clearChallengeCookie(ctx, AUTH_CHALLENGE_COOKIE);
            return ctx.json({ error: "verification_failed" }, { status: 401 });
          }
        },
      ),

      /* ── 5. list user's passkeys (session required) ───────────────── */
      listUserPasskeys: createAuthEndpoint(
        "/passkey/list",
        {
          method: "GET",
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user;
          const db = getSystemDb();
          const list = await db.bAPasskey.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              deviceType: true,
              backedUp: true,
              createdAt: true,
            },
          });
          return ctx.json({ passkeys: list });
        },
      ),

      /* ── 6. revoke passkey (session required) ───────────────────── */
      revokeUserPasskey: createAuthEndpoint(
        "/passkey/revoke",
        {
          method: "POST",
          body: z.object({ id: z.string().min(1) }),
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user;
          const db = getSystemDb();
          const target = await db.bAPasskey.findUnique({
            where: { id: ctx.body.id },
          });
          if (!target || target.userId !== user.id) {
            return ctx.json({ error: "not_found" }, { status: 404 });
          }
          await db.bAPasskey.delete({ where: { id: target.id } });
          return ctx.json({ revoked: true });
        },
      ),
    },

    /* ── per-plugin rate limits ──────────────────────────────────────── */

    rateLimit: [
      {
        pathMatcher: (path) => path.startsWith("/passkey/authenticate/"),
        window: 60,
        max: 10,
      },
      {
        pathMatcher: (path) => path.startsWith("/passkey/register/"),
        window: 60,
        max: 6,
      },
    ],
  };
};
