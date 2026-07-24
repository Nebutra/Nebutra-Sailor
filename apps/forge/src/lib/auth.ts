import "server-only";

import type { Session } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";

export { resolveTenantId } from "./tenant";

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
