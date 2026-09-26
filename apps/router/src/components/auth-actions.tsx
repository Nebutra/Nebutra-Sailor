"use client";

import { buildAuthCenterSignInUrl, buildAuthCenterSignUpUrl, useAuth } from "@nebutra/auth/client";
import { useEffect, useState } from "react";

type Variant = "header" | "compact" | "cta";

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
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [returnTo, setReturnTo] = useState("http://localhost:3106/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnTo(window.location.href);
    }
  }, []);

  if (!isLoaded) {
    return (
      <span className={`text-[12px] text-neutral-10 ${className}`} aria-hidden>
        …
      </span>
    );
  }

  if (isSignedIn && user) {
    const label = user.email ?? user.name ?? user.id;
    if (variant === "cta") {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          <p className="truncate text-[12px] text-neutral-11" title={label}>
            {label}
          </p>
          <button
            type="button"
            className="flex h-10 items-center justify-center rounded-full border border-neutral-6 bg-neutral-1 text-[13px] font-medium text-neutral-12 transition hover:bg-neutral-2"
            onClick={() => {
              void signOut();
            }}
          >
            退出登录
          </button>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          className="hidden max-w-[140px] truncate text-[12px] text-neutral-11 sm:inline"
          title={label}
        >
          {label}
        </span>
        <button
          type="button"
          className="font-medium text-neutral-12 hover:opacity-80"
          onClick={() => {
            void signOut();
          }}
        >
          退出
        </button>
      </div>
    );
  }

  const signInHref = buildAuthCenterSignInUrl(returnTo);
  const signUpHref = buildAuthCenterSignUpUrl(returnTo);

  if (variant === "cta") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <a
          href={signInHref}
          className="flex h-10 items-center justify-center rounded-full bg-neutral-12 text-[13px] font-medium text-neutral-1 transition hover:bg-neutral-11"
        >
          登录 / 注册
        </a>
        <a
          href={signUpHref}
          className="text-center text-[12px] font-medium text-blue-11 underline-offset-2 hover:underline"
        >
          没有账号？注册
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={signInHref}
        className={`font-medium text-blue-11 underline-offset-2 hover:underline ${className}`}
      >
        点击登录
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a href={signInHref} className="font-medium text-neutral-12 hover:opacity-80">
        登录
      </a>
      <a href={signUpHref} className="hover:text-neutral-12">
        注册
      </a>
    </div>
  );
}
