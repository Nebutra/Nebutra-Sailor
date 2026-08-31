"use client";

import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getConfiguredAuthProvider,
  useAuth,
} from "@nebutra/auth/client";
import { Logout } from "@nebutra/icons";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { userInitials } from "@/lib/user-initials";

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

  if (!isLoaded) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-3" aria-hidden />;
  }

  if (isSignedIn && user) {
    const displayName = user.name ?? user.email ?? user.id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label={t("menuAria")}
          className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2"
        >
          <Avatar
            size="sm"
            {...(user.imageUrl ? { src: user.imageUrl } : {})}
            title={displayName}
            letter={userInitials(user.name, user.email)}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-56" aria-label={t("menuAria")}>
          <div className="px-3 py-2">
            {user.name ? (
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            ) : null}
            {user.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void signOut();
            }}
          >
            <Logout className="size-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
