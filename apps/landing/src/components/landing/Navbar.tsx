"use client";

import { Logo, Logomark } from "@nebutra/brand";
import { getMarketingHomePath } from "@nebutra/brand/metadata-helpers";
import { DEFAULT_ROUTE_LOCALE, toRouteLocale } from "@nebutra/i18n/locales";
import { useDarkSurface } from "@nebutra/theme";
import { useTheme } from "@nebutra/tokens";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { MarketLocalePicker } from "@/components/ui/market-locale-picker";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useMount } from "@/hooks/useMount";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./navbar/DesktopNav";
import { MobileDrawer } from "./navbar/MobileDrawer";
import { NavbarAuthCluster } from "./navbar/NavbarAuthCluster";
import { UserAvatarMenu } from "./navbar/UserAvatarMenu";

/**
 * Navbar - Fixed navigation with brand logo and theme toggle
 */
export function Navbar({ forceDarkTheme = false }: { forceDarkTheme?: boolean }) {
  const locale = useLocale();
  const homeHref = getMarketingHomePath({
    locale: toRouteLocale(locale),
    defaultLocale: DEFAULT_ROUTE_LOCALE,
  });
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const [isScrolled, setIsScrolled] = useState(false);

  // The canvas, not the theme's name. A design language can paint a dark canvas
  // while the theme is still light — under gsap, linear and raycast the dark
  // wordmark was rendering on a dark background and the logo vanished.
  const isDarkCanvas = useDarkSurface();
  const isForcedDark = forceDarkTheme && !isScrolled && resolvedTheme === "light";
  const isDark = !isMounted || (isDarkCanvas ?? resolvedTheme !== "light") || isForcedDark;

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
        "fixed left-0 right-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        isScrolled
          ? "border-b border-transparent bg-background/85 backdrop-blur-md dark:border-transparent shadow-sm"
          : "bg-transparent max-lg:border-b max-lg:border-border max-lg:bg-background/90 max-lg:backdrop-blur-md",
        isForcedDark ? "dark" : "",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <a href={homeHref} className="flex items-center gap-2 relative z-[60]">
          <Logomark size={32} variant={isDark ? "mono" : "color"} className="md:hidden" />
          <Logo variant="en" size={150} inverted={isDark} className="hidden md:block" />
        </a>

        {/* --- DESKTOP NAV --- */}
        <DesktopNav />

        {/* --- GLOBAL CONTROLS (Desktop) --- */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-5">
          <MarketLocalePicker />
          <ThemeSwitcher />

          <NavbarAuthCluster />
        </div>

        {/* --- GLOBAL CONTROLS & DRAWER (Mobile) --- */}
        <div className="flex items-center gap-1 lg:hidden">
          <MarketLocalePicker />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <UserAvatarMenu />
          <MobileDrawer />
        </div>
      </div>
    </nav>
  );
}

Navbar.displayName = "Navbar";
