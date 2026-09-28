import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "@nebutra/auth/react/context";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

/**
 * Re-reads the session after something changed it here — a new display name,
 * say — so the header and every other reader of the auth context catch up
 * without a page load. Resolves once the new session is in place.
 */
const SessionReloadContext = createContext<() => Promise<void>>(async () => undefined);

export function useReloadSession(): () => Promise<void> {
  return use(SessionReloadContext);
}

export function BrowserAuthProvider({ children }: { children: ReactNode }) {
  const provider = getViteAuthProvider();
  const [authState, setAuthState] = useState<AuthContextValue>(() =>
    createUnauthenticatedAuthContext(provider, false),
  );
  // Bumped on every load, so a slow response never overwrites a newer one.
  const generation = useRef(0);

  const reloadSession = useCallback(async () => {
    const current = ++generation.current;
    try {
      const sessionPayload = await loadSession();
      if (current !== generation.current) return;
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
    } catch {
      // A failed first load reads as signed out; a failed reload keeps what
      // the page already shows rather than signing the user out.
      if (current === generation.current) {
        setAuthState((previous) =>
          previous.isLoaded ? previous : createUnauthenticatedAuthContext(provider, true),
        );
      }
    }
  }, [provider]);

  useEffect(() => {
    void reloadSession();
    return () => {
      // Unmounted: whatever is in flight is stale.
      generation.current += 1;
    };
  }, [reloadSession]);

  const value = useMemo(() => authState, [authState]);

  return (
    <SessionReloadContext value={reloadSession}>
      <AuthContextProvider value={value}>{children}</AuthContextProvider>
    </SessionReloadContext>
  );
}
