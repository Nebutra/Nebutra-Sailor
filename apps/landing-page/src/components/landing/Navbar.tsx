"use client";

import { Logo, Logomark } from "@nebutra/brand";
import { useTheme } from "@nebutra/tokens";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./navbar/DesktopNav";
import { MobileDrawer } from "./navbar/MobileDrawer";
import { UserAvatarMenu } from "./navbar/UserAvatarMenu";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

/**
 * Navbar - Fixed navigation with brand logo and theme toggle
 */
export function Navbar({ forceDarkTheme = false }: { forceDarkTheme?: boolean }) {
  const t = useTranslations("nav");
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const [isScrolled, setIsScrolled] = useState(false);

  const isForcedDark = forceDarkTheme && !isScrolled && resolvedTheme === "light";
  const isDark = !isMounted || resolvedTheme !== "light" || isForcedDark;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-transparent bg-white/85 backdrop-blur-md dark:border-transparent dark:bg-black/80 shadow-sm"
          : "bg-transparent max-lg:border-b max-lg:border-[var(--neutral-6)] max-lg:bg-[var(--neutral-1)]/90 max-lg:backdrop-blur-md dark:max-lg:bg-black/75",
        isForcedDark ? "dark" : "",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 relative z-[60]">
          <Logomark size={32} variant={isDark ? "mono" : "color"} className="md:hidden" />
          <Logo variant="en" size={150} inverted={isDark} className="hidden md:block" />
        </Link>

        {/* --- DESKTOP NAV --- */}
        <DesktopNav />

        {/* --- GLOBAL CONTROLS (Desktop) --- */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-5">
          <LocaleSwitcher />
          <ThemeSwitcher />

          {/*
            Closed-loop signed-in indicator. UserAvatarMenu only mounts when
            the `nebutra_session_hint` cookie is present AND the /api/me/public
            fetch succeeds — otherwise renders null, and the Sign-In + CTA
            below remain the visible affordance.

            We don't conditionally hide Sign-In / Get-Sailed: showing both is
            harmless when the avatar is mounted (avatar gets clicked first
            anyway), and avoids a flash-of-anonymous-CTA during avatar
            hydration. The avatar sits left of the CTAs so it's the first
            element a returning user sees.
          */}
          <UserAvatarMenu />

          <a
            href={`${APP_URL}/sign-in`}
            className="whitespace-nowrap text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12"
          >
            {t("signIn")}
          </a>
          <a
            href={`${APP_URL}/sign-up`}
            className="whitespace-nowrap rounded-[var(--radius-lg)] bg-[color:var(--neutral-12)] px-3 py-1.5 text-[0.8rem] font-medium text-[color:var(--neutral-1)] shadow-sm transition-colors hover:bg-[color:var(--neutral-11)] xl:px-4 xl:py-2 xl:text-sm"
          >
            {t("getStarted")}
          </a>
        </div>

        {/* --- GLOBAL CONTROLS & DRAWER (Mobile) --- */}
        <div className="flex items-center gap-1 lg:hidden">
          <LocaleSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <MobileDrawer />
        </div>
      </div>
    </nav>
  );
}

Navbar.displayName = "Navbar";
