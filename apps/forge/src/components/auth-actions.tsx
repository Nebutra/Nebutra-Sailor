"use client";

import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getConfiguredAuthProvider,
  useAuth,
} from "@nebutra/auth/client";
import { Button } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";

export function AuthActions() {
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [returnTo, setReturnTo] = useState("http://localhost:3105/");
  useEffect(() => {
    if (typeof window !== "undefined") setReturnTo(window.location.href);
  }, []);
  if (!isLoaded)
    return (
      <span className="text-[12px] text-[var(--neutral-10)]" aria-hidden>
        …
      </span>
    );
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
          退出
        </Button>
      </div>
    );
  }
  const provider = getConfiguredAuthProvider();
  const signInHref = provider === "clerk" ? "/sign-in" : buildAuthCenterSignInUrl(returnTo);
  const signUpHref = provider === "clerk" ? "/sign-up" : buildAuthCenterSignUpUrl(returnTo);
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <a href={signInHref}>登录</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={signUpHref}>注册</a>
      </Button>
    </div>
  );
}
