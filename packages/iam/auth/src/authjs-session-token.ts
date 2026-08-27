/**
 * Auth.js / next-auth v5 session JWT helpers.
 *
 * Product apps must not import `next-auth/jwt` directly (architecture boundary).
 * Use these wrappers when minting or inspecting Auth.js-compatible session cookies
 * (e.g. Google One Tap handoff).
 */

import { decode, encode, type JWT } from "next-auth/jwt";

export type AuthJsSessionTokenClaims = JWT;

export type EncodeAuthJsSessionTokenInput = {
  token: AuthJsSessionTokenClaims;
  secret: string;
  /** Cookie name used as salt (Auth.js convention). */
  salt: string;
  maxAge?: number;
};

/**
 * Encode an Auth.js session JWT (same wire format as next-auth `encode`).
 */
export async function encodeAuthJsSessionToken(
  input: EncodeAuthJsSessionTokenInput,
): Promise<string> {
  return encode({
    token: input.token,
    secret: input.secret,
    salt: input.salt,
    ...(input.maxAge !== undefined ? { maxAge: input.maxAge } : {}),
  });
}

export type DecodeAuthJsSessionTokenInput = {
  token: string;
  secret: string;
  salt: string;
};

/**
 * Decode an Auth.js session JWT (same wire format as next-auth `decode`).
 */
export async function decodeAuthJsSessionToken(
  input: DecodeAuthJsSessionTokenInput,
): Promise<AuthJsSessionTokenClaims | null> {
  return decode({
    token: input.token,
    secret: input.secret,
    salt: input.salt,
  });
}
