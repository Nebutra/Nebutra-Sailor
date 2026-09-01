"use client";

import { buildAuthCenterSignInUrl, getConfiguredAuthProvider, useAuth } from "@nebutra/auth/client";
import { useEffect, useMemo, useState } from "react";

export function AuthActions({
  signInHref,
  variant = "nav",
}: {
  signInHref?: string;
  variant?: "nav" | "cta";
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

  return (
    <a className={variant === "cta" ? "pill pill-ink" : "auth-link"} href={href}>
      进入
    </a>
  );
}
