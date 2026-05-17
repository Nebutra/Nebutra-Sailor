"use client";

import { useAuth } from "@nebutra/auth/client";
import {
  ChevronRight,
  Logout as LogOut,
  DeviceDesktop as Monitor,
  Moon,
  SettingsGear as Settings,
  Sun,
  User,
} from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccountDialog } from "@/components/account/account-dialog";

type ThemeChoice = "system" | "light" | "dark";

interface UserMenuProps {
  /**
   * Override the post-sign-out redirect target. Defaults to `/sign-in`.
   * Exposed primarily for tests.
   */
  signOutRedirect?: string;
}

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "?";
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const THEME_ICON: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function UserMenu({ signOutRedirect = "/sign-in" }: UserMenuProps = {}) {
  const t = useTranslations("userMenu");
  const tTheme = useTranslations("theme");
  const { isSignedIn, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const account = useAccountDialog();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    try {
      await signOut();
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = signOutRedirect;
      }
    }
  }, [signOut, signOutRedirect]);

  if (!isSignedIn || !user) {
    return null;
  }

  const initials = initialsFor(user.name, user.email);
  const activeTheme = (theme as ThemeChoice | undefined) ?? "system";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2 text-xs font-semibold text-neutral-12 transition-colors hover:bg-neutral-3 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.name ?? user.email ?? "User avatar"}
            width={32}
            height={32}
            className="h-8 w-8 object-cover"
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("ariaLabel")}
          className="absolute right-0 z-50 mt-2 w-60 rounded-md border border-neutral-7 bg-neutral-1 p-1 shadow-lg dark:border-white/10 dark:bg-neutral-12"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-neutral-12 dark:text-white">
              {user.name ?? user.email}
            </p>
            {user.email && (
              <p className="truncate text-xs text-neutral-11 dark:text-white/60">{user.email}</p>
            )}
          </div>
          <div className="my-1 h-px bg-neutral-6 dark:bg-white/10" />

          <button
            type="button"
            role="menuitem"
            aria-label={t("profile")}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
            onClick={() => {
              setOpen(false);
              account.openDialog("profile");
            }}
          >
            <User className="h-4 w-4" aria-hidden />
            <span>{t("profile")}</span>
          </button>
          <a
            role="menuitem"
            href="/settings"
            aria-label={t("settings")}
            className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" aria-hidden />
            <span>{t("settings")}</span>
          </a>

          <button
            type="button"
            role="menuitem"
            aria-label={t("theme")}
            aria-haspopup="menu"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <Sun className="h-4 w-4" aria-hidden />
              <span>{t("theme")}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>

          {themeOpen && (
            <div role="menu" aria-label={t("theme")} className="mt-1 px-1">
              {(["light", "dark", "system"] as const).map((choice) => {
                const Icon = THEME_ICON[choice];
                const isActive = activeTheme === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    aria-label={tTheme(choice)}
                    onClick={() => setTheme(choice)}
                    className="flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-xs text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <span>{tTheme(choice)}</span>
                    </span>
                    {isActive && <span aria-hidden>•</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="my-1 h-px bg-neutral-6 dark:bg-white/10" />

          <button
            type="button"
            role="menuitem"
            aria-label={t("signOut")}
            onClick={() => {
              void handleSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span>{t("signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
