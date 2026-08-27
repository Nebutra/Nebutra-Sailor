"use client";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ButtonLink } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthActions, type AuthActionsProps } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { ForgeMark } from "@/components/forge-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { RouterMark } from "@/components/router-mark";

const NAV_KEYS = [
  { href: "/", key: "tools" as const },
  { href: "/wallet", key: "wallet" as const },
  { href: "/docs", key: "api" as const },
] as const;

const ROUTER_URL = process.env.NEXT_PUBLIC_ROUTER_URL?.trim() || getBrandOrigin("router");

export type SiteHeaderProps = AuthActionsProps;

export function SiteHeader({ signInHref, signUpHref }: SiteHeaderProps = {}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--neutral-1)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] min-w-0 items-center gap-2 px-4 sm:gap-4 sm:px-6 md:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 sm:gap-2.5"
          aria-label={t("homeAria", { brandName: brand.name })}
        >
          <BrandLogo variant="mark" className="h-8 w-8 sm:hidden" />
          {/* sm:inline-flex — not sm:block (block stacks mark above wordmark) */}
          <BrandLogo variant="horizontal" className="hidden h-[26px] w-auto sm:inline-flex" />
          <span className="hidden h-4 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <ForgeMark className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="sr-only">Forge</span>
        </Link>
        <nav
          aria-label={t("main")}
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1"
        >
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
                  "shrink-0 rounded-[var(--radius-md)] px-2 py-2 text-[13px] sm:px-3",
                  active ? "font-medium text-[var(--neutral-12)]" : "text-[var(--neutral-11)]",
                )}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <LocaleSwitcher />
          <ButtonLink
            href={ROUTER_URL}
            variant="ghost"
            shape="square"
            iconSize="lg"
            aria-label={t("routerAria", { brandName: brand.name })}
            title="Router"
            className="hidden sm:inline-flex hover:bg-[var(--neutral-3)]"
          >
            <RouterMark className="h-7 w-7" />
          </ButtonLink>
          <AuthActions
            {...(signInHref ? { signInHref } : {})}
            {...(signUpHref ? { signUpHref } : {})}
          />
        </div>
      </div>
    </header>
  );
}
