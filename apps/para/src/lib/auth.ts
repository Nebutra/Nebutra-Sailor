import "server-only";

import type { Session } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";
import { paraOrigin } from "./auth-urls";

let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export async function getAuth() {
  if (!authInstance) {
    authInstance = await createAuth({ provider: getConfiguredAuthProvider() });
  }
  return authInstance;
}

/**
 * The session for the current request, or null. Every gateway route PARA calls requires one, so in
 * gateway mode a null session means the shell can only show its signed-out state.
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const auth = await getAuth();
    return await auth.getSession(new Request(paraOrigin(), { headers: await headers() }));
  } catch {
    return null;
  }
}
