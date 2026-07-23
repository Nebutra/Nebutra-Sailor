"use client";

import { brand } from "@nebutra/brand/metadata";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

const NAV = [
  { href: "/", label: "工具" },
  { href: "/wallet", label: "钱包" },
  { href: "/docs", label: "API" },
] as const;

/**
 * Product header — SaaS best practice (Linear / Vercel / public-page-chrome):
 * - sticky, h-16, single bottom border, frosted glass
 * - left: official logo + product name (secondary)
 * - middle-left: text links with spacing (not centered absolute, not pill chips)
 * - right: one secondary action
 * - active: color weight only, no filled pill
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--neutral-1)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-8 px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-12)] focus-visible:ring-offset-2"
          aria-label={`${brand.name} Forge 首页`}
        >
          <BrandLogo variant="mark" className="h-8 w-8 sm:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-[26px] w-auto sm:block" />
          <span className="hidden h-4 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <span className="text-[13px] font-medium text-[var(--neutral-11)]">Forge</span>
        </Link>

        {/* Primary nav — sits after brand, grows; classic product chrome */}
        <nav
          aria-label="主导航"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:gap-0.5 md:gap-1"
        >
          {NAV.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname.startsWith("/t/")
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "font-medium text-[var(--neutral-12)]"
                    : "text-[var(--neutral-11)] hover:text-[var(--neutral-12)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href="http://localhost:3106">Router</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
