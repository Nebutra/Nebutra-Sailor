"use client";

import { brand } from "@nebutra/brand/metadata";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

const NAV = [
  { href: "/", label: "概览" },
  { href: "/wallet", label: "充值" },
  { href: "/keys", label: "Keys" },
  { href: "/models", label: "模型" },
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "接入" },
] as const;

/**
 * Same chrome contract as Forge SiteHeader:
 * logo left · text nav · action right · no absolute center · no pill active state
 */
export function RouterNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--neutral-1)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-6 px-6 lg:gap-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-12)] focus-visible:ring-offset-2"
          aria-label={`${brand.name} Router 首页`}
        >
          <BrandLogo variant="mark" className="h-8 w-8 sm:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-[26px] w-auto sm:block" />
          <span className="hidden h-4 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <span className="text-[13px] font-medium text-[var(--neutral-11)]">Router</span>
        </Link>

        <nav
          aria-label="主导航"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 px-2.5 py-2 text-[13px] transition-colors sm:px-3",
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

        <div className="flex shrink-0 items-center">
          <Button asChild variant="outline" size="sm">
            <a href="http://localhost:3105">Forge</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
