import "server-only";

import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";

let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export async function getAuth() {
  if (!authInstance) {
    const provider = getConfiguredAuthProvider();
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}
