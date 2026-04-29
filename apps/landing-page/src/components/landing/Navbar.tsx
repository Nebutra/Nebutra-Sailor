"use client";

import { Logo, Logomark } from "@nebutra/brand";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./navbar/DesktopNav";
import { MobileDrawer } from "./navbar/MobileDrawer";

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
          : "bg-transparent",
        isForcedDark ? "dark" : "",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 relative z-[60]">
          <Logomark size={32} variant={isDark ? "inverse" : "color"} className="md:hidden" />
          <Logo variant="en" size={150} inverted={isDark} className="hidden md:block" />
        </Link>

        {/* --- DESKTOP NAV --- */}
        <DesktopNav />

        {/* --- GLOBAL CONTROLS (Desktop) --- */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-5">
          <LocaleSwitcher />
          <ThemeSwitcher />

          <a
            href={`${APP_URL}/sign-in`}
            className="whitespace-nowrap text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
          >
            {t("signIn")}
          </a>
          <a
            href={`${APP_URL}/sign-up`}
            className="whitespace-nowrap rounded-lg bg-[color:var(--neutral-12)] px-3 py-1.5 text-[0.8rem] font-medium text-[color:var(--neutral-1)] shadow-sm transition-colors hover:bg-[color:var(--neutral-11)] xl:px-4 xl:py-2 xl:text-sm"
          >
            {t("getStarted")}
          </a>
        </div>

        {/* --- GLOBAL CONTROLS & DRAWER (Mobile) --- */}
        <div className="flex items-center gap-1 md:hidden">
          <LocaleSwitcher />
          <ThemeSwitcher />
          <MobileDrawer />
        </div>
      </div>
    </nav>
  );
}

Navbar.displayName = "Navbar";
