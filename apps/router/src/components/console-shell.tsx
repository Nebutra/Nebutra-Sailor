"use client";

import { brand } from "@nebutra/brand/metadata";
import {
  Analytics,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Key,
  MagnifyingGlass,
} from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MarketFooter } from "@/components/market-footer";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * 302 journey shells (see docs/plans/2026-07-23-router-302-full-route-interaction-study.md):
 *
 * Market  / · /models          public chrome
 * Admin   /dashboard|keys|…    admin
 * Use     /use                 quick use
 *
 * Locales: full canonical BCP-47 wheel via NEXT_LOCALE cookie (never 7-locale stopgap).
 */

const ADMIN_NAV = [
  { href: "/dashboard", key: "dashboard" as const, icon: Home },
  { href: "/usage", key: "usage" as const, icon: Analytics },
  { href: "/keys", key: "keys" as const, icon: Key },
  { href: "/wallet", key: "wallet" as const, icon: CreditCard },
  { href: "/docs", key: "docs" as const, icon: BookOpen },
] as const;

/**
 * The sidebar's collapsed state travels in a cookie, not in localStorage.
 *
 * localStorage can only be read after hydration, so the sidebar painted
 * expanded and then snapped shut on every navigation. A cookie is on the
 * request, so the server renders the width the user chose.
 */
export const SIDEBAR_COOKIE = "nebutra-router-sidebar-collapsed";

type Surface = "market" | "admin" | "use";

function surfaceOf(pathname: string): Surface {
  if (pathname === "/use" || pathname.startsWith("/use/") || pathname.startsWith("/playground"))
    return "use";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/keys") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/docs")
  )
    return "admin";
  return "market";
}

export function ConsoleShell({
  children,
  sidebarCollapsed = false,
}: {
  children: ReactNode;
  /** Read from the cookie on the server, so the first paint is already right. */
  sidebarCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const surface = surfaceOf(pathname);
  if (surface === "use") return <UsageShell>{children}</UsageShell>;
  if (surface === "admin")
    return (
      <AdminShell pathname={pathname} initialCollapsed={sidebarCollapsed}>
        {children}
      </AdminShell>
    );
  return <MarketShell pathname={pathname}>{children}</MarketShell>;
}

/**
 * Public chrome — one 56px bar, the way OpenRouter and Vercel frame a catalogue:
 * mark, four destinations, search, then the account cluster. It replaces a
 * utility bar + logo row + search row + pill dock (four stacked bands, ~210px
 * before any content).
 */
const MARKET_NAV = [
  { href: "/models", key: "models" as const },
  { href: "/docs", key: "docs" as const },
  { href: "/use", key: "playground" as const },
  { href: "/dashboard", key: "console" as const },
] as const;

function MarketShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("chrome");
  const tNav = useTranslations("shelf.nav");
  const seededQuery = pathname.startsWith("/models") ? (searchParams.get("q") ?? "") : "";

  /**
   * The field is uncontrolled and re-keyed on `?q=`, so navigation (including
   * back/forward) reseeds it instead of leaving the previous term in the box.
   */
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = form instanceof HTMLFormElement ? new FormData(form).get("q") : null;
    const query = typeof value === "string" ? value.trim() : "";
    router.push(query ? `/models?q=${encodeURIComponent(query)}` : "/models");
  };

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex h-8 shrink-0 items-center rounded-[var(--radius-md)] px-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[var(--layer-nav)] border-b border-border bg-background/85 backdrop-blur-md">
        <div className="router-market-shell flex h-14 items-center gap-2 md:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label={`${brand.name} Router`}
          >
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-sm font-semibold">Router</span>
          </Link>
          <nav aria-label={tNav("label")} className="hidden items-center md:flex">
            {MARKET_NAV.map((item) => navLink(item.href, tNav(item.key)))}
          </nav>
          <search className="ml-auto hidden w-full max-w-xs lg:block">
            <form onSubmit={onSearch}>
              <label className="relative block">
                <span className="sr-only">{t("search")}</span>
                <MagnifyingGlass
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  key={seededQuery}
                  name="q"
                  defaultValue={seededQuery}
                  placeholder={tNav("searchPlaceholder")}
                  className="h-8 pl-8 text-sm"
                />
              </label>
            </form>
          </search>
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-xs" />
            <ThemeToggle />
            <AuthActions variant="header" />
          </div>
        </div>
        {/* Below md the destinations move to a scrollable second row rather than
            a menu: four links fit, and nothing hides behind a tap. */}
        <nav
          aria-label={tNav("label")}
          className="router-market-shell flex h-10 items-center gap-1 overflow-x-auto [scrollbar-width:none] md:hidden"
        >
          {MARKET_NAV.map((item) => navLink(item.href, tNav(item.key)))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketFooter />
    </div>
  );
}

function AdminShell({
  pathname,
  initialCollapsed,
  children,
}: {
  pathname: string;
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const tChrome = useTranslations("chrome");
  const [isCollapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[var(--layer-nav)] border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-sm font-semibold">{t("title")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-xs text-neutral-11 sm:gap-3">
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-xs" />
            <ThemeToggle />
            <Link href="/" className="hover:text-neutral-12">
              {t("backToMarket")}
            </Link>
            <Link href="/use" className="hover:text-neutral-12">
              {t("quickUse")}
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        <aside
          className={cn(
            "sticky hidden h-[calc(100vh-3.5rem)] top-14 shrink-0 border-r border-neutral-6 md:flex md:flex-col",
            isCollapsed ? "w-12" : "w-[200px]",
          )}
        >
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {ADMIN_NAV.map(({ href, key, icon: Icon }) => {
              const label = t(key);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "flex h-8 items-center rounded-lg text-sm font-medium",
                    isCollapsed ? "justify-center" : "gap-2 px-2",
                    active ? "bg-neutral-3 text-neutral-12" : "text-neutral-11 hover:bg-neutral-2",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {!isCollapsed ? label : null}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="m-2 flex h-8 items-center justify-center rounded-lg text-neutral-11 hover:bg-neutral-2"
            onClick={() => {
              setCollapsed((c) => {
                const next = !c;
                // biome-ignore lint/suspicious/noDocumentCookie: the width must be on the request, so the server can render it collapsed
                document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
                return next;
              });
            }}
            aria-label={isCollapsed ? tChrome("expandSidebar") : tChrome("collapseSidebar")}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function UsageShell({ children }: { children: ReactNode }) {
  const t = useTranslations("chrome");
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[var(--layer-nav)] border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/use" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-sm font-semibold">{t("usageTitle")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-xs text-neutral-11 sm:gap-3">
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-xs" />
            <ThemeToggle />
            <Link href="/" className="hover:text-neutral-12">
              {t("market")}
            </Link>
            <Link href="/dashboard" className="hover:text-neutral-12">
              {t("adminConsole")}
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
