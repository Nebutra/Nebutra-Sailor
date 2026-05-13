"use client";

import type { ReactNode } from "react";
import { DEV_FIXTURE_ORG, DEV_FIXTURE_USER } from "../../providers/dev";
import { AuthContextProvider, type AuthContextValue } from "../context";

const DEV_AUTH_CONTEXT: AuthContextValue = {
  provider: "dev",
  user: {
    id: DEV_FIXTURE_USER.id,
    email: DEV_FIXTURE_USER.email,
    name: DEV_FIXTURE_USER.name,
  },
  session: {
    userId: DEV_FIXTURE_USER.id,
    organizationId: DEV_FIXTURE_ORG.id,
    role: "owner",
  },
  organization: {
    id: DEV_FIXTURE_ORG.id,
    name: DEV_FIXTURE_ORG.name,
    slug: DEV_FIXTURE_ORG.slug,
  },
  membership: { role: "owner" },
  isLoaded: true,
  isSignedIn: true,
  getToken: async () => "dev-token",
  signOut: async () => {
    console.warn("[@nebutra/auth/dev] signOut is a no-op in dev mode.");
  },
  setActiveOrganization: async () => {
    console.warn("[@nebutra/auth/dev] setActiveOrganization is a no-op in dev mode.");
  },
};

/**
 * Client-side dev provider. Mounts an authenticated AuthContext with
 * fixture data so the entire app behaves as signed-in without hitting any
 * real auth backend. Production loading is blocked at module import time.
 *
 * @see packages/iam/auth/src/providers/dev.ts for the server-side counterpart.
 */
export function DevProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[@nebutra/auth] The `dev` provider MUST NOT be used in production. " +
        "Unset NEXT_PUBLIC_AUTH_PROVIDER or set it to a real provider.",
    );
  }

  return <AuthContextProvider value={DEV_AUTH_CONTEXT}>{children}</AuthContextProvider>;
}
