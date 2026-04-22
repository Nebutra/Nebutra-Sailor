import type { AuthProvider, Session, User } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";

type InstanceState =
  | { status: "idle" }
  | { status: "ready"; instance: AuthProvider }
  | { status: "unavailable" };

let state: InstanceState = { status: "idle" };

async function getAuthInstance(): Promise<AuthProvider | null> {
  if (state.status === "ready") return state.instance;
  if (state.status === "unavailable") return null;

  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "better-auth") as
    | "clerk"
    | "better-auth";

  try {
    const instance = await createAuth({ provider });
    state = { status: "ready", instance };
    return instance;
  } catch (error) {
    // Provider init can fail at build time (no BETTER_AUTH_SECRET, no DB reachable).
    // Treat as unauthenticated so SSG/export succeeds and runtime callers redirect
    // to sign-in cleanly. The error is surfaced once so it is not silent.
    console.error(
      `[landing-page/lib/auth] ${provider} provider unavailable — treating as unauthenticated:`,
      error instanceof Error ? error.message : error,
    );
    state = { status: "unavailable" };
    return null;
  }
}

async function getSessionFromHeaders(): Promise<Session | null> {
  const auth = await getAuthInstance();
  if (!auth) return null;
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
  if (!auth) return null;
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
  if (!auth) return null;
  return auth.getUser(session.userId);
}

export async function getUserById(userId: string): Promise<User | null> {
  const auth = await getAuthInstance();
  if (!auth) return null;
  return auth.getUser(userId);
}
