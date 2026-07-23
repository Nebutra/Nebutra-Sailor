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
 * Product chrome header — structure aligned with landing Navbar:
 * h-16 · max-w-[1400px] · px-6 · official brand logo (mark on mobile, horizontal on md+).
 */
export function RouterNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-md)]"
          aria-label={`${brand.name} Router 首页`}
        >
          <BrandLogo variant="mark" className="h-8 w-8 md:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-7 w-auto md:block" />
          <span className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" aria-hidden />
          <span className="text-sm font-medium tracking-tight text-muted-foreground">Router</span>
        </Link>

        <nav
          aria-label="主导航"
          className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1"
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
                  "rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
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

        <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
          <a href="http://localhost:3105">Forge</a>
        </Button>
      </div>
    </header>
  );
}
