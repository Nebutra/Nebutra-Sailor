"use client";

import { brand } from "@nebutra/brand/metadata";
import { safeGetItem, safeSetItem } from "@nebutra/browser-utils";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Key,
  MagnifyingGlass,
} from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { MarketFooter } from "@/components/market-footer";
import { RouterMark } from "@/components/router-mark";
import { MarketIcon } from "@/lib/market-icons";
import { MARKET_CHANNELS } from "@/lib/market-taxonomy";

/**
 * 302 journey shells (see docs/plans/2026-07-23-router-302-full-route-interaction-study.md):
 *
 * Market  / · /models          公开货架 chrome
 * Admin   /dashboard|keys|…    管理后台
 * Use     /use                 快捷使用
 */

const ADMIN_NAV = [
  { href: "/dashboard", label: "数据汇总", icon: Home },
  { href: "/keys", label: "API Keys", icon: Key },
  { href: "/wallet", label: "钱包", icon: CreditCard },
  { href: "/docs", label: "接入文档", icon: BookOpen },
] as const;

const STORAGE_KEY = "nebutra-router-sidebar-collapsed";

const CURRENCIES = [
  { id: "USD", label: "USD $" },
  { id: "CNY", label: "CNY ¥" },
  { id: "JPY", label: "JPY ¥" },
  { id: "RUB", label: "RUB ₽" },
] as const;

const LOCALES = [
  { id: "zh-CN", label: "简体中文" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ru", label: "Русский" },
] as const;

type Surface = "market" | "admin" | "use";

function surfaceOf(pathname: string): Surface {
  if (pathname === "/use" || pathname.startsWith("/use/") || pathname.startsWith("/playground"))
    return "use";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/keys") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/docs")
  )
    return "admin";
  return "market";
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const surface = surfaceOf(pathname);
  if (surface === "use") return <UsageShell>{children}</UsageShell>;
  if (surface === "admin") return <AdminShell pathname={pathname}>{children}</AdminShell>;
  return <MarketShell pathname={pathname}>{children}</MarketShell>;
}

/** Tiny hover/click dropdown — 302 style */
function HeaderMenu({
  label,
  items,
  align = "left",
}: {
  label: string;
  items: readonly { id: string; label: string; href?: string; onSelect?: () => void }[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // Hover-open chrome menu (302 utility dropdowns)
    // biome-ignore lint/a11y/noStaticElementInteractions: hover affordance wraps trigger+panel
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-0.5 hover:text-[var(--neutral-12)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[120px] rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-1)] py-1 shadow-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                href={item.href}
                role="menuitem"
                className="block px-3 py-1.5 text-left text-[12px] text-[var(--neutral-12)] hover:bg-[var(--neutral-2)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-[12px] text-[var(--neutral-12)] hover:bg-[var(--neutral-2)]"
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 302 public chrome: utility L/R · logo+search · product-type pills */
function MarketShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]["id"]>("USD");
  const [locale, setLocale] = useState<(typeof LOCALES)[number]["id"]>("zh-CN");

  const productType = searchParams.get("product_type") === "tool" ? "tool" : "api";
  const isHome = pathname === "/";
  const isModels = pathname.startsWith("/models");
  const isProductDetail = pathname.startsWith("/product/detail");
  const isApiChannel = (isHome || isModels || isProductDetail) && productType === "api";
  const isToolChannel = isHome && productType === "tool";

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/models?q=${encodeURIComponent(query)}` : "/models");
  };

  const currencyLabel = CURRENCIES.find((c) => c.id === currency)?.label ?? "USD $";
  const localeLabel = LOCALES.find((l) => l.id === locale)?.label ?? "简体中文";

  return (
    <div className="router-market text-[var(--neutral-12)]">
      {/* utility bar — hairline, quieter */}
      <div className="border-b border-[var(--rm-line)]/80 bg-white/40 backdrop-blur-sm">
        <div className="router-market-shell flex h-9 items-center justify-between gap-3 text-[12px] text-[var(--neutral-11)]">
          <div className="flex items-center gap-3">
            <HeaderMenu
              label={currencyLabel}
              items={CURRENCIES.map((c) => ({
                id: c.id,
                label: c.label,
                onSelect: () => setCurrency(c.id),
              }))}
            />
            <HeaderMenu
              label={localeLabel}
              items={LOCALES.map((l) => ({
                id: l.id,
                label: l.label,
                onSelect: () => setLocale(l.id),
              }))}
            />
            <span className="text-[var(--neutral-7)]" aria-hidden>
              |
            </span>
            <AuthActions variant="header" />
          </div>

          <div className="flex items-center gap-3.5">
            {!isHome ? (
              <Link href="/" className="hover:text-[var(--neutral-12)]">
                首页
              </Link>
            ) : null}
            <Link href="/dashboard" className="hover:text-[var(--neutral-12)]">
              管理后台
            </Link>
            <Link href="/use" className="hover:text-[var(--neutral-12)]">
              快捷使用
            </Link>
            <HeaderMenu
              label="技术支持"
              align="right"
              items={[
                { id: "docs", label: "API 文档", href: "/docs" },
                { id: "help", label: "接入说明", href: "/docs" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* brand + search — 更宽搜索、更高控件，提升「大气」比例 */}
      <div className="router-market-shell flex flex-col gap-4 pt-7 pb-4 md:flex-row md:items-center md:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${brand.name} Router`}
        >
          {/* 自形 wordmark：logo-horizontal-en（mark + 自形字标），不用系统字体拼品牌字 */}
          <BrandLogo variant="horizontal" className="h-8 w-auto md:h-9" />
          <span className="hidden h-5 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <RouterMark className="h-7 w-7 md:h-8 md:w-8" />
          <span className="sr-only">Router</span>
        </Link>
        <form onSubmit={onSearch} className="flex min-w-0 flex-1 gap-2.5">
          {/* 搜索：输入框内嵌主按钮，避免独立蓝胶囊抢戏 */}
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-[var(--neutral-9)]"
              aria-hidden
            />
            <input
              data-allow-native
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="请问你想用 AI 做什么呢？"
              className="h-12 w-full rounded-full border border-[var(--rm-panel-border)] bg-white pr-[6rem] pl-11 text-[15px] shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-[var(--neutral-9)] focus:border-[var(--neutral-8)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--neutral-6)_65%,transparent)]"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-full bg-[var(--neutral-12)] px-4 text-[13px] font-medium text-[var(--neutral-1)] transition hover:bg-[var(--neutral-11)]"
            >
              搜索
            </button>
          </div>
          <Link
            href="/models"
            className="hidden h-12 shrink-0 items-center rounded-full border border-[var(--rm-panel-border)] bg-white px-5 text-[14px] font-medium text-[var(--neutral-11)] shadow-[0_1px_2px_rgb(15_23_42/0.03)] transition hover:border-[var(--neutral-7)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)] sm:inline-flex"
          >
            AI 推荐
          </Link>
        </form>
      </div>

      {/* channel dock — floating pill bar like 302 */}
      <div className="router-market-shell pb-5">
        <nav className="router-market-dock mx-auto flex max-w-4xl items-center justify-center gap-1 p-1.5">
          {MARKET_CHANNELS.map((ch) => {
            const active =
              (ch.match === "tool" && isToolChannel) ||
              (ch.match === "api" && isApiChannel && isHome) ||
              (ch.match === "models" && isModels);
            const className = cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] transition",
              active
                ? "bg-[var(--neutral-12)] font-medium text-[var(--neutral-1)] shadow-sm"
                : "text-[var(--neutral-11)] hover:bg-black/[0.03] hover:text-[var(--neutral-12)]",
            );
            const body = (
              <>
                <MarketIcon
                  name={ch.icon}
                  className={cn("h-4 w-4", active ? "opacity-90" : "opacity-70")}
                />
                {ch.label}
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

function AdminShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(safeGetItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  const isCollapsed = ready && collapsed;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--neutral-1)] text-[var(--neutral-12)]">
      <div className="border-b border-[var(--neutral-6)]">
        <div className="mx-auto flex h-11 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-[13px] font-semibold">管理后台</span>
          </Link>
          <div className="ml-auto flex gap-3 text-[12px] text-[var(--neutral-11)]">
            <Link href="/" className="hover:text-[var(--neutral-12)]">
              返回集市
            </Link>
            <Link href="/use" className="hover:text-[var(--neutral-12)]">
              快捷使用
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        <aside
          className={cn(
            "sticky top-0 hidden h-[calc(100vh-2.75rem)] shrink-0 border-r border-[var(--neutral-6)] md:flex md:flex-col",
            isCollapsed ? "w-12" : "w-[200px]",
          )}
        >
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "flex h-8 items-center rounded-lg text-[13px]",
                    isCollapsed ? "justify-center" : "gap-2 px-2",
                    active
                      ? "bg-[var(--neutral-3)] font-medium"
                      : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]",
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
            className="m-2 flex h-8 items-center justify-center rounded-lg text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]"
            onClick={() => {
              setCollapsed((c) => {
                const n = !c;
                safeSetItem(STORAGE_KEY, n ? "1" : "0");
                return n;
              });
            }}
            aria-label="折叠"
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
  return (
    <div className="flex min-h-screen flex-col bg-[var(--neutral-1)] text-[var(--neutral-12)]">
      <div className="border-b border-[var(--neutral-6)]">
        <div className="mx-auto flex h-11 max-w-[1280px] items-center gap-3 px-4 md:px-6">
          <Link href="/use" className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6 w-6" />
            <span className="text-[13px] font-semibold">快捷使用</span>
          </Link>
          <div className="ml-auto flex gap-3 text-[12px] text-[var(--neutral-11)]">
            <Link href="/" className="hover:text-[var(--neutral-12)]">
              集市
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--neutral-12)]">
              管理后台
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
