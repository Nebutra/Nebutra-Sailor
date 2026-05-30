"use client";

import { useAuth } from "@nebutra/auth/client";
import { usePathname, useRouter } from "@nebutra/i18n/routing";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Lifebuoy as LifeBuoy,
  Logout as LogOut,
  DeviceDesktop as Monitor,
  Moon,
  SettingsGear as Settings,
  Sun,
  User,
} from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useAccountDialog } from "@/components/account/account-dialog";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";
import { dicebearAvatarUrl } from "@/lib/avatar";

type ThemeChoice = "system" | "light" | "dark";
const LOCALES = ["en", "zh"] as const;
type LocaleCode = (typeof LOCALES)[number];
const NEXT_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface UserMenuProps {
  /**
   * Override the post-sign-out redirect target. Defaults to `/sign-in`.
   * Exposed primarily for tests.
   */
  signOutRedirect?: string;
  /**
   * `"icon"` (default) renders an avatar-only circular trigger. `"row"` renders
   * a full-width Lovable-style row with avatar + name + chevron — used in the
   * expanded sidebar footer where the menu absorbs Feedback / Language / Theme.
   */
  variant?: "icon" | "row";
}

const THEME_ICON: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

function setLocaleCookie(locale: LocaleCode): void {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=${NEXT_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function UserMenu({ signOutRedirect = "/sign-in", variant = "icon" }: UserMenuProps = {}) {
  const t = useTranslations("userMenu");
  const tTheme = useTranslations("theme");
  const tLocale = useTranslations("LocaleSwitcher");
  const { isSignedIn, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const account = useAccountDialog();
  const { openDialog: openFeedback } = useFeedbackDialog();
  const locale = useLocale() as LocaleCode;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);

  const closeAll = useCallback(() => {
    setOpen(false);
    setThemeOpen(false);
    setLocaleOpen(false);
  }, []);

  const { triggerRef, menuRef, style } = useAnchoredMenu(open, closeAll);

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

  const handleLocaleChange = useCallback(
    (next: LocaleCode) => {
      setLocaleCookie(next);
      setOpen(false);
      setLocaleOpen(false);
      startTransition(() => {
        router.replace(pathname, { locale: next });
      });
    },
    [pathname, router],
  );

  if (!isSignedIn || !user) {
    return null;
  }

  const activeTheme = (theme as ThemeChoice | undefined) ?? "system";
  const displayName = user.name ?? user.email ?? "User";

  // Avatar (Image when uploaded, DiceBear fallback otherwise)
  const avatarNode = user.imageUrl ? (
    <Image
      src={user.imageUrl}
      alt={displayName}
      width={32}
      height={32}
      className="h-full w-full object-cover"
    />
  ) : (
    <img
      src={dicebearAvatarUrl(user.email ?? user.name)}
      alt={displayName}
      width={32}
      height={32}
      className="h-full w-full object-cover"
    />
  );

  const trigger =
    variant === "row" ? (
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-1 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2 dark:border-white/10 dark:bg-white/10">
          {avatarNode}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-sidebar-foreground">
          {displayName}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-sidebar-foreground/60" aria-hidden="true" />
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2 text-xs font-semibold text-neutral-12 transition-colors hover:bg-neutral-3 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        {avatarNode}
      </button>
    );

  return (
    <>
      {trigger}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("ariaLabel")}
            style={style}
            className="w-60 rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-1 p-1 shadow-lg dark:border-white/10 dark:bg-neutral-12"
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
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
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
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" aria-hidden />
              <span>{t("settings")}</span>
            </a>

            <button
              type="button"
              role="menuitem"
              aria-label={t("feedback")}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                openFeedback();
              }}
            >
              <LifeBuoy className="h-4 w-4" aria-hidden />
              <span>{t("feedback")}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              aria-label={tLocale("ariaLabel")}
              aria-haspopup="menu"
              aria-expanded={localeOpen}
              onClick={() => setLocaleOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" aria-hidden />
                <span>{tLocale("ariaLabel")}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="uppercase text-xs text-neutral-11 dark:text-white/60">
                  {locale}
                </span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>

            {localeOpen && (
              <div role="menu" aria-label={tLocale("ariaLabel")} className="mt-1 px-1">
                {LOCALES.map((cur) => {
                  const isActive = locale === cur;
                  return (
                    <button
                      key={cur}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => handleLocaleChange(cur)}
                      className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
                    >
                      <span>{tLocale(cur)}</span>
                      {isActive && <span aria-hidden>•</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              role="menuitem"
              aria-label={t("theme")}
              aria-haspopup="menu"
              aria-expanded={themeOpen}
              onClick={() => setThemeOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
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
                      className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
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
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span>{t("signOut")}</span>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
