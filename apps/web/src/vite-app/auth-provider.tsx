import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "@nebutra/auth/react/context";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { getViteAuthProvider } from "@/vite-app/app-env";

type SessionPayload = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    imageUrl?: string;
  };
  session?: {
    userId?: string;
    organizationId?: string;
    role?: string;
  };
  organization?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  membership?: {
    role?: string;
  };
};

function normalizeSession(payload: SessionPayload | null): Partial<AuthContextValue> {
  if (!payload?.user?.id && !payload?.session?.userId) return {};

  const userId = payload.user?.id ?? payload.session?.userId ?? "";

  return {
    user: {
      id: userId,
      email: payload.user?.email,
      name: payload.user?.name,
      imageUrl: payload.user?.imageUrl,
    },
    session: {
      userId,
      organizationId: payload.session?.organizationId,
      role: payload.session?.role,
    },
    organization: payload.organization?.id
      ? {
          id: payload.organization.id,
          name: payload.organization.name ?? payload.organization.slug ?? "Workspace",
          slug: payload.organization.slug ?? payload.organization.id,
        }
      : null,
    membership: payload.membership?.role ? { role: payload.membership.role } : null,
    isSignedIn: true,
  };
}

async function loadSession(): Promise<SessionPayload | null> {
  const response = await fetch(resolveApiUrl("/api/auth/session"), {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load auth session (${response.status})`);

  return (await response.json().catch(() => null)) as SessionPayload | null;
}

export function BrowserAuthProvider({ children }: { children: ReactNode }) {
  const provider = getViteAuthProvider();
  const [authState, setAuthState] = useState<AuthContextValue>(() =>
    createUnauthenticatedAuthContext(provider, false),
  );

  useEffect(() => {
    let cancelled = false;

    loadSession()
      .then((sessionPayload) => {
        if (cancelled) return;
        setAuthState({
          ...createUnauthenticatedAuthContext(provider, true),
          ...normalizeSession(sessionPayload),
          provider,
          isLoaded: true,
          getToken: async () => null,
          signOut: async () => {
            await fetch(resolveApiUrl("/api/auth/sign-out"), {
              method: "POST",
              credentials: "include",
            }).catch(() => undefined);
            setAuthState(createUnauthenticatedAuthContext(provider, true));
          },
          setActiveOrganization: async (orgId: string) => {
            await fetch(resolveApiUrl("/api/organizations/active"), {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ organizationId: orgId }),
            });
          },
        });
      })
      .catch(() => {
        if (!cancelled) setAuthState(createUnauthenticatedAuthContext(provider, true));
      });

    return () => {
      cancelled = true;
    };
  }, [provider]);

  const value = useMemo(() => authState, [authState]);

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}
