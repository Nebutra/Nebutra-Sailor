"use client";

import { useAuth } from "@nebutra/auth/client";
import { setLocaleCookie } from "@nebutra/i18n/cookies";
import { buildCanonicalLocaleLabels, defaultCompactTrigger } from "@nebutra/i18n/locale-switcher";
import { CANONICAL_LOCALES, type CanonicalLocale } from "@nebutra/i18n/locales";
import {
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuFilterInput,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useAccountDialog } from "@/components/account/account-dialog";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { dicebearAvatarUrl } from "@/lib/avatar";

type ThemeChoice = "system" | "light" | "dark";
const LOCALES = CANONICAL_LOCALES;
type LocaleCode = CanonicalLocale;
const LOCALE_LABELS = buildCanonicalLocaleLabels(CANONICAL_LOCALES) as Record<LocaleCode, string>;

interface UserMenuProps {
  /**
   * Override the post-sign-out redirect target. Defaults to `/sign-in`.
   * Exposed primarily for tests.
   */
  signOutRedirect?: string;
  /**
   * `"icon"` (default) renders an avatar-only circular trigger. `"row"` renders
   * a full-width row with avatar + name + chevron — used in the expanded
   * sidebar footer where the menu absorbs Feedback / Language / Theme.
   */
  variant?: "icon" | "row";
}

const THEME_ICON: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

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
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [localeQuery, setLocaleQuery] = useState("");

  const filteredLocales = useMemo(() => {
    const q = localeQuery.trim().toLowerCase();
    const ordered = [locale, ...LOCALES.filter((l) => l !== locale)] as readonly LocaleCode[];
    if (!q) return ordered;
    return ordered.filter((l) => {
      const label = (LOCALE_LABELS[l] ?? l).toLowerCase();
      return label.includes(q) || l.toLowerCase().includes(q);
    });
  }, [locale, localeQuery]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setLocaleQuery("");
  }, []);

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
      setLocaleQuery("");
      // Cookie mode: write cookie then re-run getRequestConfig server-side via
      // router.refresh() — no URL change, no navigation, instant switch.
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  if (!isSignedIn || !user) {
    return null;
  }

  const hasLocaleKey = (key: string) =>
    typeof tLocale.has === "function" && tLocale.has(key as never);
  const searchLabel = hasLocaleKey("searchPlaceholder")
    ? tLocale("searchPlaceholder" as never)
    : "Search";
  const noResultsLabel = hasLocaleKey("noResults") ? tLocale("noResults" as never) : "No matches";

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

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      {variant === "row" ? (
        <DropdownMenuTrigger
          aria-label={t("ariaLabel")}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-1 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2">
            {avatarNode}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-sidebar-foreground">
            {displayName}
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-sidebar-foreground/60"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          aria-label={t("ariaLabel")}
          className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-7 bg-neutral-2 text-xs font-semibold text-neutral-12 transition-colors hover:bg-neutral-3"
        >
          {avatarNode}
        </DropdownMenuTrigger>
      )}

      {/* The row variant is docked at the bottom of the sidebar rail, so the
          menu opens upward and left-aligns with the row. */}
      <DropdownMenuContent
        aria-label={t("ariaLabel")}
        side={variant === "row" ? "top" : "bottom"}
        align={variant === "row" ? "start" : "end"}
        sideOffset={6}
        className="w-60"
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-foreground">{user.name ?? user.email}</p>
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            account.openDialog("profile");
          }}
        >
          <User className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          <span>{t("profile")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            router.push("/settings");
          }}
        >
          <Settings className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          <span>{t("settings")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            openFeedback();
          }}
        >
          <LifeBuoy className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          <span>{t("feedback")}</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            <span>{tLocale("ariaLabel")}</span>
            <span className="ml-auto max-w-[4.5rem] truncate pl-2 text-xs text-muted-foreground">
              {defaultCompactTrigger(locale)}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-label={tLocale("ariaLabel")} className="w-60">
            <div className="p-1">
              <DropdownMenuFilterInput
                value={localeQuery}
                aria-label={searchLabel}
                placeholder={searchLabel}
                onChange={(event) => setLocaleQuery(event.target.value)}
              />
            </div>
            {filteredLocales.length === 0 ? (
              <DropdownMenuEmpty>{noResultsLabel}</DropdownMenuEmpty>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={locale}
                  onValueChange={(next) => handleLocaleChange(String(next) as LocaleCode)}
                >
                  {filteredLocales.map((cur) => (
                    <DropdownMenuRadioItem key={cur} value={cur} className="text-xs">
                      <span className="truncate">{LOCALE_LABELS[cur] ?? cur}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </div>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            <span>{t("theme")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-label={t("theme")} className="w-44">
            <DropdownMenuRadioGroup
              value={activeTheme}
              onValueChange={(next) => setTheme(String(next) as ThemeChoice)}
            >
              {THEME_CHOICES.map((choice) => {
                const Icon = THEME_ICON[choice];
                return (
                  <DropdownMenuRadioItem key={choice} value={choice} className="text-xs">
                    <Icon className="mr-2 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{tTheme(choice)}</span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            void handleSignOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          <span>{t("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
