import type { AuthProvider, Session, User } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";

let authInstance: AuthProvider | null = null;

async function getAuthInstance(): Promise<AuthProvider> {
  if (authInstance) return authInstance;
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "better-auth") as
    | "clerk"
    | "better-auth";
  authInstance = await createAuth({ provider });
  return authInstance;
}

async function getSessionFromHeaders(): Promise<Session | null> {
  const auth = await getAuthInstance();
  const incoming = await headers();
  const forwarded = new Headers();
  for (const [key, value] of incoming.entries()) {
    forwarded.set(key, value);
  }
  const syntheticRequest = new Request("http://localhost/", { headers: forwarded });
  return auth.getSession(syntheticRequest);
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  const auth = await getAuthInstance();
  return auth.getSession(request);
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
  if (!session?.userId) return null;
  const auth = await getAuthInstance();
  return auth.getUser(session.userId);
}

export async function getUserById(userId: string): Promise<User | null> {
  const auth = await getAuthInstance();
  return auth.getUser(userId);
}
