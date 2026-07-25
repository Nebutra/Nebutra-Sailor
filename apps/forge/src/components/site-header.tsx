"use client";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { ForgeMark } from "@/components/forge-mark";
import { RouterMark } from "@/components/router-mark";

const NAV_KEYS = [
  { href: "/", key: "tools" as const },
  { href: "/wallet", key: "wallet" as const },
  { href: "/docs", key: "api" as const },
] as const;

const ROUTER_URL = process.env.NEXT_PUBLIC_ROUTER_URL?.trim() || getBrandOrigin("router");

export function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--neutral-1)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-8 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={t("homeAria", { brandName: brand.name })}
        >
          <BrandLogo variant="mark" className="h-8 w-8 sm:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-[26px] w-auto sm:block" />
          <span className="hidden h-4 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <ForgeMark className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="sr-only">Forge</span>
        </Link>
        <nav aria-label={t("main")} className="flex min-w-0 flex-1 items-center gap-1">
          {NAV_KEYS.map(({ href, key }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname.startsWith("/t/")
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 px-3 py-2 text-[13px]",
                  active ? "font-medium text-[var(--neutral-12)]" : "text-[var(--neutral-11)]",
                )}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={ROUTER_URL}
            aria-label={t("routerAria", { brandName: brand.name })}
            title="Router"
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition hover:bg-[var(--neutral-3)] sm:inline-flex"
          >
            <RouterMark className="h-7 w-7" />
          </a>
          <AuthActions />
        </div>
      </div>
    </header>
  );
}
