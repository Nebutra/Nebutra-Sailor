"use client";

import { buildAuthCenterSignInUrl, buildAuthCenterSignUpUrl, useAuth } from "@nebutra/auth/client";
import { brand } from "@nebutra/brand/metadata";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Variant = "header" | "compact" | "cta";

/**
 * Server render and first paint return to the Router origin; after mount the
 * exact page. It used to start at `http://localhost:3106/`, so a click before
 * hydration sent a production visitor back to a dev port.
 */
const ROUTER_ORIGIN = (
  process.env.NEXT_PUBLIC_ROUTER_URL?.trim() || `https://${brand.domains.router}`
).replace(/\/+$/, "");

/**
 * Router auth chrome — Better Auth (default) via Auth Center redirect.
 * Mirrors apps/forge AuthActions; no direct better-auth / clerk imports.
 */
export function AuthActions({
  variant = "header",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const t = useTranslations("auth");
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [returnTo, setReturnTo] = useState(`${ROUTER_ORIGIN}/`);

  useEffect(() => {
    setReturnTo(window.location.href);
  }, []);

  if (!isLoaded) {
    return (
      <span className={`text-xs text-neutral-11 ${className}`} aria-hidden>
        …
      </span>
    );
  }

  if (isSignedIn && user) {
    const label = user.email ?? user.name ?? user.id;
    if (variant === "cta") {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          <p className="truncate text-xs text-neutral-11">{label}</p>
          <Button
            variant="outline"
            shape="circle"
            className="w-full"
            onClick={() => {
              void signOut();
            }}
          >
            {t("signOutLong")}
          </Button>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="hidden max-w-36 truncate text-xs text-neutral-11 sm:inline">{label}</span>
        <Button
          variant="link"
          size="tiny"
          className="h-auto px-0 text-xs font-medium text-neutral-12"
          onClick={() => {
            void signOut();
          }}
        >
          {t("signOut")}
        </Button>
      </div>
    );
  }

  const signInHref = buildAuthCenterSignInUrl(returnTo);
  const signUpHref = buildAuthCenterSignUpUrl(returnTo);

  if (variant === "cta") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Button asChild variant="ink" shape="circle" className="w-full">
          <a href={signInHref}>{t("signInOrUp")}</a>
        </Button>
        <a
          href={signUpHref}
          className="text-center text-xs font-medium text-ring underline-offset-2 hover:underline"
        >
          {t("noAccount")}
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={signInHref}
        className={`font-medium text-ring underline-offset-2 hover:underline ${className}`}
      >
        {t("signInPrompt")}
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a href={signInHref} className="font-medium text-neutral-12 hover:underline">
        {t("signIn")}
      </a>
      <a href={signUpHref} className="transition-colors hover:text-neutral-12">
        {t("signUp")}
      </a>
    </div>
  );
}
