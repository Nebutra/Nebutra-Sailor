"use client";

import { buildAuthCenterSignInUrl, getConfiguredAuthProvider, useAuth } from "@nebutra/auth/client";
import { useEffect, useMemo, useState } from "react";

/**
 * Sign in / sign out, rendered inside the profile menu so the top bar keeps one visual level.
 * Returns the viewer to wherever they were, which for PARA is usually a workspace.
 */
export function AuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setReturnTo(window.location.href);
  }, []);

  const href = useMemo(() => {
    if (getConfiguredAuthProvider() === "clerk") return "/sign-in";
    return returnTo ? buildAuthCenterSignInUrl(returnTo) : buildAuthCenterSignInUrl();
  }, [returnTo]);

  const item =
    "flex h-[var(--para-h-control)] w-full items-center rounded-md px-2 text-left text-foreground text-body hover:bg-accent";

  if (!isLoaded) return <span className={`${item} text-muted-foreground`}>…</span>;

  if (isSignedIn) {
    return (
      <>
        <span className="flex h-[var(--para-h-control)] w-full items-center truncate px-2 text-muted-foreground text-label">
          {user?.email ?? user?.name ?? "Signed in"}
        </span>
        <button
          type="button"
          className={item}
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          Sign out
        </button>
      </>
    );
  }

  return (
    <a className={item} href={href} onClick={onNavigate}>
      Sign in
    </a>
  );
}
