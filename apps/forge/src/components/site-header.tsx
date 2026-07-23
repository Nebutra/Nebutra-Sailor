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
 * Product chrome header — structure aligned with landing Navbar:
 * h-16 · max-w-[1400px] · px-6 · official brand logo (mark on mobile, horizontal on md+).
 * Product name is a secondary label, never a hand-drawn wordmark.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-md)]"
          aria-label={`${brand.name} Forge 首页`}
        >
          {/* VI: digital mark ≥ ~32–35px; mobile mark, desktop horizontal lockup */}
          <BrandLogo variant="mark" className="h-8 w-8 md:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-7 w-auto md:block" />
          <span className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" aria-hidden />
          <span className="text-sm font-medium tracking-tight text-muted-foreground">Forge</span>
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-1 sm:gap-2">
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
                  "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a href="http://localhost:3106">Router</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
