"use client";

import { buildAuthCenterSignInUrl, getConfiguredAuthProvider, useAuth } from "@nebutra/auth/client";
import { useEffect, useMemo, useState } from "react";

export function AuthActions({
  signInHref,
  variant = "nav",
}: {
  signInHref?: string;
  /** "leave" is the signed-in sign-out on its own — /me already is the account page. */
  variant?: "nav" | "cta" | "leave";
}) {
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setReturnTo(window.location.href);
  }, []);

  const href = useMemo(() => {
    if (getConfiguredAuthProvider() === "clerk") return "/sign-in";
    if (signInHref) {
      if (!returnTo) return signInHref;
      const url = new URL(signInHref);
      url.searchParams.set("returnTo", returnTo);
      return url.toString();
    }
    if (returnTo) return buildAuthCenterSignInUrl(returnTo);
    return buildAuthCenterSignInUrl();
  }, [returnTo, signInHref]);

  if (isLoaded && isSignedIn) {
    if (variant === "leave") {
      return (
        <button
          type="button"
          className="pill pill-ghost"
          onClick={() => {
            void signOut();
          }}
        >
          离开
        </button>
      );
    }
    const label = user?.name ?? user?.email ?? "Me";
    return (
      <span className="auth-actions">
        <a className="auth-link" href="/me">
          {label}
        </a>
        <button
          type="button"
          className="auth-link"
          onClick={() => {
            void signOut();
          }}
        >
          离开
        </button>
      </span>
    );
  }

  // The server already established the session for this variant, so a sign-in
  // link here would only flash before the client auth state loads.
  if (variant === "leave") return null;

  return (
    <a className={variant === "cta" ? "pill pill-ink" : "auth-link"} href={href}>
      进入
    </a>
  );
}
