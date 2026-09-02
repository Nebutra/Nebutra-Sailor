import "server-only";

import type { Session } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";
import { kuanlanOrigin } from "./auth-urls";

let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export async function getAuth() {
  if (!authInstance) {
    authInstance = await createAuth({ provider: getConfiguredAuthProvider() });
  }
  return authInstance;
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  try {
    const auth = await getAuth();
    return await auth.getSession(request);
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const auth = await getAuth();
    const request = new Request(kuanlanOrigin(), { headers: await headers() });
    return await auth.getSession(request);
  } catch {
    return null;
  }
}
