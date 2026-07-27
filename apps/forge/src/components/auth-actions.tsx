"use client";

import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getConfiguredAuthProvider,
  useAuth,
} from "@nebutra/auth/client";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export type AuthActionsProps = {
  /** Server-computed sign-in URL (avoids client env / localhost fallback). */
  signInHref?: string;
  /** Server-computed sign-up URL. */
  signUpHref?: string;
};

export function AuthActions({ signInHref, signUpHref }: AuthActionsProps = {}) {
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const t = useTranslations("auth");
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setReturnTo(window.location.href);
  }, []);

  const provider = getConfiguredAuthProvider();

  // Prefer live returnTo once mounted; fall back to server-injected URLs so the
  // first paint never points at localhost:3101 when NEXT_PUBLIC_AUTH_URL was
  // missing from a misconfigured client bundle.
  const resolvedSignIn = useMemo(() => {
    if (provider === "clerk") return "/sign-in";
    if (returnTo) return buildAuthCenterSignInUrl(returnTo);
    return signInHref ?? buildAuthCenterSignInUrl();
  }, [provider, returnTo, signInHref]);

  const resolvedSignUp = useMemo(() => {
    if (provider === "clerk") return "/sign-up";
    if (returnTo) return buildAuthCenterSignUpUrl(returnTo);
    return signUpHref ?? buildAuthCenterSignUpUrl();
  }, [provider, returnTo, signUpHref]);

  // While session is loading, still render Sign in / Sign up with server-injected
  // URLs so the first paint never links to localhost:3101.
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href={resolvedSignIn}>{t("signIn")}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={resolvedSignUp}>{t("signUp")}</a>
        </Button>
      </div>
    );
  }

  if (isSignedIn && user) {
    const label = user.email ?? user.name ?? user.id;
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden max-w-[140px] truncate text-[12px] text-[var(--neutral-11)] sm:inline"
          title={label}
        >
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void signOut();
          }}
        >
          {t("signOut")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <a href={resolvedSignIn}>{t("signIn")}</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={resolvedSignUp}>{t("signUp")}</a>
      </Button>
    </div>
  );
}
