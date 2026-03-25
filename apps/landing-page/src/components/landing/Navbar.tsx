"use client";

import { Logo, Logomark } from "@nebutra/brand";
import {
  BookOpen,
  ChevronDown,
  Cross,
  LogoGithub,
  Menu,
  Route,
  Sparkles,
  Users,
} from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

/**
 * Navbar - Fixed navigation with brand logo and theme toggle
 */
export function Navbar() {
  const t = useTranslations("nav");
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDark = !isMounted || resolvedTheme !== "light";

  const navLinks = [
    { label: t("features"), href: "/features" },
    { label: t("pricing"), href: "/pricing" },
    { label: t("about"), href: "/about" },
    {
      label: t("resources"),
      children: [
        { label: t("ideas"), href: "/ideas", icon: Sparkles },
        { label: t("opc"), href: "/opc", icon: Users },
        { label: t("roadmap"), href: "/roadmap", icon: Route },
        { label: t("docs"), href: "https://docs.nebutra.com", icon: BookOpen },
      ],
    },
    {
      label: t("github"),
      href: "https://github.com/Nebutra/Nebutra-Sailor",
      icon: LogoGithub,
    },
  ];

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
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logomark size={32} variant={isDark ? "inverse" : "color"} className="md:hidden" />
          <Logo variant="en" size={150} inverted={isDark} className="hidden md:block" />
        </Link>

        <div className="hidden lg:flex items-center gap-3 xl:gap-5">
          {navLinks.map((link) => {
            if (link.children) {
              return (
                <div key={link.label} className="group/nav relative inline-block py-4">
                  <button className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white">
                    {link.label}
                    <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover/nav:-rotate-180" />
                  </button>
                  <div className="absolute left-1/2 top-12 mt-1 w-52 -translate-x-1/2 opacity-0 invisible group-hover/nav:visible group-hover/nav:opacity-100 transition-all duration-300 origin-top bg-transparent">
                    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl p-2.5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
                      <div className="flex flex-col gap-1">
                        {link.children.map((child) => {
                          const isExternal = child.href.startsWith("http");
                          const Component = isExternal ? "a" : Link;
                          return (
                            <Component
                              key={child.label}
                              href={child.href as any}
                              className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground/90 hover:bg-muted/80 hover:text-foreground transition-all duration-200 group/child"
                              {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                            >
                              {child.icon ? (
                                <child.icon className="h-4 w-4 text-muted-foreground/60 group-hover/child:text-foreground transition-colors" />
                              ) : null}
                              {child.label}
                            </Component>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const isExternal = link.href.startsWith("http");
            const Component = isExternal ? "a" : Link;
            return (
              <Component
                key={link.label}
                href={link.href as any}
                className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Component>
            );
          })}

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
            className="whitespace-nowrap rounded-lg bg-[image:var(--brand-gradient)] px-3 py-1.5 xl:px-4 xl:py-2 text-[0.8rem] xl:text-sm font-medium text-white shadow-sm hover:shadow-md transition-shadow"
          >
            {t("getStarted")}
          </a>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LocaleSwitcher />
          <ThemeSwitcher />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <Cross className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-neutral-7 bg-white/95 backdrop-blur-md md:hidden dark:border-white/10 dark:bg-black/95">
          <div className="flex flex-col gap-4 px-6 py-4">
            {navLinks.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="flex flex-col gap-3 py-1">
                    <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {link.label}
                    </span>
                    <div className="flex flex-col gap-4 pl-4 border-l-2 border-border/40">
                      {link.children.map((child) => {
                        const isExternal = child.href.startsWith("http");
                        const Component = isExternal ? "a" : Link;
                        return (
                          <Component
                            key={child.label}
                            href={child.href as any}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                          >
                            {child.icon ? <child.icon className="h-4 w-4 opacity-70" /> : null}
                            {child.label}
                          </Component>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const isExternal = link.href.startsWith("http");
              const Component = isExternal ? "a" : Link;
              return (
                <Component
                  key={link.label}
                  href={link.href as any}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                  {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {link.icon && <link.icon className="h-5 w-5" />}
                  {link.label}
                </Component>
              );
            })}

            <div className="mt-2 flex flex-col gap-3 border-t border-neutral-7 pt-4 dark:border-white/10">
              <a
                href={`${APP_URL}/sign-in`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-lg border border-neutral-7 px-4 py-3 text-center text-sm font-medium text-neutral-12 dark:border-white/15 dark:text-white"
              >
                {t("signIn")}
              </a>
              <a
                href={`${APP_URL}/sign-up`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-lg bg-[image:var(--brand-gradient)] px-4 py-3 text-center text-sm font-medium text-white"
              >
                {t("getStarted")}
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

Navbar.displayName = "Navbar";
