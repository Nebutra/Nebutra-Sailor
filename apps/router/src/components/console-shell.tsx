"use client";

import { brand } from "@nebutra/brand/metadata";
import {
  Analytics,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Key,
  MagnifyingGlass,
} from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MarketFooter } from "@/components/market-footer";
import { RouterMark } from "@/components/router-mark";
import { MarketIcon } from "@/lib/market-icons";
import { MARKET_CHANNELS } from "@/lib/market-taxonomy";

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
 * Tiny hover/click dropdown — 302 style. The DS menu (openOnHover), not an
 * in-place absolute panel: the utility bar is backdrop-blurred, which traps
 * any in-place z-index under the page below it.
 */
function HeaderMenu({
  label,
  items,
  align = "left",
}: {
  label: string;
  items: readonly { id: string; label: string; href?: string; onSelect?: () => void }[];
  align?: "left" | "right";
}) {
  const itemClass = "px-3 py-1.5 text-[12px]";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild openOnHover>
        <button type="button" className="inline-flex items-center gap-0.5 hover:text-foreground">
          {label}
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align === "right" ? "end" : "start"}
        sideOffset={4}
        className="max-h-72 min-w-[140px] overflow-y-auto py-1"
      >
        {items.map((item) =>
          item.href ? (
            <DropdownMenuItem
              key={item.id}
              render={<Link href={item.href} />}
              className={itemClass}
            >
              {item.label}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.id} onClick={() => item.onSelect?.()} className={itemClass}>
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 302 public chrome: utility L/R · logo+search · product-type pills */
function MarketShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("chrome");
  const tCh = useTranslations("channels");
  const seededQuery = searchParams.get("q") ?? "";

  const productType = searchParams.get("product_type") === "tool" ? "tool" : "api";
  const isHome = pathname === "/";
  const isModels = pathname.startsWith("/models");
  const isProductDetail = pathname.startsWith("/product/detail");
  const isApiChannel = (isHome || isModels || isProductDetail) && productType === "api";
  const isToolChannel = isHome && productType === "tool";

  /**
   * The field is uncontrolled and re-keyed on `?q=`, so navigation (including
   * back/forward) reseeds it instead of leaving the previous term in the box
   * while the results below show a different one.
   */
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = form instanceof HTMLFormElement ? new FormData(form).get("q") : null;
    const query = typeof value === "string" ? value.trim() : "";
    router.push(query ? `/models?q=${encodeURIComponent(query)}` : "/models");
  };

  return (
    <div className="router-market text-neutral-12">
      {/* utility bar — hairline, quieter */}
      <div className="border-b border-[var(--rm-line)]/80 bg-background/40 backdrop-blur-sm">
        <div className="router-market-shell flex h-9 items-center justify-between gap-3 text-[12px] text-neutral-11">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Settlement currency. A picker used to sit here that changed a
                piece of local state and converted nothing — every price on the
                site stayed in USD. Display currencies need the FX table
                (Batch D); until it exists this says what is true. */}
            <span title="计价与结算均为美元">USD $</span>
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-[12px]" />
            <span className="text-neutral-7" aria-hidden>
              |
            </span>
            <AuthActions variant="header" />
          </div>

          <div className="flex items-center gap-3.5">
            {!isHome ? (
              <Link href="/" className="hover:text-neutral-12">
                {t("home")}
              </Link>
            ) : null}
            <Link href="/dashboard" className="hover:text-neutral-12">
              {t("adminConsole")}
            </Link>
            <Link href="/use" className="hover:text-neutral-12">
              {t("quickUse")}
            </Link>
            <HeaderMenu
              label={t("support")}
              align="right"
              items={[
                { id: "docs", label: t("apiDocs"), href: "/docs" },
                { id: "help", label: t("integrationHelp"), href: "/docs" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="router-market-shell flex flex-col gap-4 pt-7 pb-4 md:flex-row md:items-center md:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${brand.name} Router`}
        >
          <BrandLogo variant="horizontal" className="h-8 w-auto md:h-9" />
          <span className="hidden h-5 w-px bg-neutral-6 sm:block" aria-hidden />
          <RouterMark className="h-7 w-7 md:h-8 md:w-8" />
          <span className="sr-only">Router</span>
        </Link>
        <form onSubmit={onSearch} className="flex min-w-0 flex-1 gap-2.5">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-neutral-9"
              aria-hidden
            />
            <input
              data-allow-native
              key={seededQuery}
              name="q"
              defaultValue={seededQuery}
              placeholder={t("searchPlaceholder")}
              className="h-12 w-full rounded-full border border-[var(--rm-panel-border)] bg-neutral-1 pr-[6rem] pl-11 text-[15px] shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-neutral-9 focus:border-neutral-8 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--neutral-6)_65%,transparent)]"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-full bg-neutral-12 px-4 text-[13px] font-medium text-neutral-1 transition hover:bg-neutral-11"
            >
              {t("search")}
            </button>
          </div>
          <Link
            href="/models"
            className="hidden h-12 shrink-0 items-center rounded-full border border-[var(--rm-panel-border)] bg-neutral-1 px-5 text-[14px] font-medium text-neutral-11 shadow-[0_1px_2px_rgb(15_23_42/0.03)] transition hover:border-neutral-7 hover:bg-neutral-2 hover:text-neutral-12 sm:inline-flex"
          >
            {t("aiRecommend")}
          </Link>
        </form>
      </div>

      <div className="router-market-shell pb-5">
        <nav className="router-market-dock mx-auto flex max-w-4xl items-center justify-center gap-1 p-1.5">
          {MARKET_CHANNELS.map((ch) => {
            const active =
              (ch.match === "tool" && isToolChannel) ||
              (ch.match === "api" && isApiChannel && isHome) ||
              (ch.match === "models" && isModels);
            const className = cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium transition",
              active
                ? "bg-neutral-12 text-neutral-1 shadow-sm"
                : "text-neutral-11 hover:bg-neutral-12/[0.03] hover:text-neutral-12",
            );
            const label = tCh.has(ch.id as never) ? tCh(ch.id as never) : ch.label;
            const body = (
              <>
                <MarketIcon
                  name={ch.icon}
                  className={cn("h-4 w-4", active ? "opacity-90" : "opacity-70")}
                />
                {label}
              </>
            );
            if (ch.external) {
              return (
                <a key={ch.id} href={ch.href} className={className}>
                  {body}
                </a>
              );
            }
            return (
              <Link key={ch.id} href={ch.href} className={className}>
                {body}
              </Link>
            );
          })}
        </nav>
      </div>

      <main id="main" className="pb-4">
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
    <div className="flex min-h-screen flex-col bg-neutral-1 text-neutral-12">
      <div className="border-b border-neutral-6">
        <div className="mx-auto flex h-11 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-[13px] font-semibold">{t("title")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-[12px] text-neutral-11 sm:gap-3">
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-[12px]" />
            <Link href="/" className="hover:text-neutral-12">
              {t("backToMarket")}
            </Link>
            <Link href="/use" className="hover:text-neutral-12">
              {t("quickUse")}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        <aside
          className={cn(
            "sticky top-0 hidden h-[calc(100vh-2.75rem)] shrink-0 border-r border-neutral-6 md:flex md:flex-col",
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
                    "flex h-8 items-center rounded-lg text-[13px] font-medium",
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
    <div className="flex min-h-screen flex-col bg-neutral-1 text-neutral-12">
      <div className="border-b border-neutral-6">
        <div className="mx-auto flex h-11 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/use" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-[13px] font-semibold">{t("usageTitle")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-[12px] text-neutral-11 sm:gap-3">
            <LocaleSwitcher className="[&_button]:min-h-8 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-[12px]" />
            <Link href="/" className="hover:text-neutral-12">
              {t("market")}
            </Link>
            <Link href="/dashboard" className="hover:text-neutral-12">
              {t("adminConsole")}
            </Link>
          </div>
        </div>
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
