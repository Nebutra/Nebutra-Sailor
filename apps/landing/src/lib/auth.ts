import type { Session, User } from "@nebutra/auth";
import { fetchAuthCenterSession } from "@nebutra/auth/auth-center-session";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { headers } from "next/headers";

/**
 * Who is signed in, asked of the auth edge (`/api/auth/get-session`, the
 * browser's cookies forwarded) — the same answer every product app gets.
 *
 * This used to build a Better Auth instance in the landing process. The
 * landing app holds no auth secret and no database by design, so that
 * instance never came up and every visitor read as signed out: people who
 * had just signed in still saw "Sign in to comment" and could not post.
 */

const authBase = () => (process.env.BETTER_AUTH_URL || getBrandOrigin("auth")).replace(/\/$/, "");

/** Users seen on a session in the last minute, so getUserById can answer without a database. */
const recentUsers = new Map<string, { user: User; at: number }>();
const USER_TTL_MS = 60_000;

function toUser(raw: Record<string, unknown>): User | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  return {
    id,
    email: typeof raw.email === "string" ? raw.email : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    imageUrl: typeof raw.image === "string" ? raw.image : undefined,
    createdAt: new Date(typeof raw.createdAt === "string" ? raw.createdAt : Date.now()),
  };
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  let center: Awaited<ReturnType<typeof fetchAuthCenterSession>>;
  try {
    center = await fetchAuthCenterSession(request, authBase());
  } catch (error) {
    console.error(
      "[landing/lib/auth] auth center unavailable — treating as signed out:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  const user = center ? toUser(center.user) : null;
  if (!user) return null;
  recentUsers.set(user.id, { user, at: Date.now() });
  const expires = center?.session.expiresAt;
  return {
    userId: user.id,
    email: user.email,
    expiresAt: new Date(typeof expires === "string" ? expires : Date.now() + USER_TTL_MS),
  };
}

async function getSessionFromHeaders(): Promise<Session | null> {
  const incoming = await headers();
  return getSessionFromRequest(new Request(authBase(), { headers: new Headers(incoming) }));
}

export async function getAuth(): Promise<{ userId: string | null; isSignedIn: boolean }> {
  const session = await getSessionFromHeaders();
  return {
    userId: session?.userId ?? null,
    isSignedIn: Boolean(session?.userId),
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSessionFromHeaders();
  return session ? getUserById(session.userId) : null;
}

/** The user behind a session this process resolved in the last minute. */
export async function getUserById(userId: string): Promise<User | null> {
  const hit = recentUsers.get(userId);
  if (!hit || Date.now() - hit.at > USER_TTL_MS) return null;
  return hit.user;
}
