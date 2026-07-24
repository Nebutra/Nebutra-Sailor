"use client";
import { brand } from "@nebutra/brand/metadata";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthActions } from "@/components/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { ForgeMark } from "@/components/forge-mark";
import { RouterMark } from "@/components/router-mark";

const NAV = [
  { href: "/", label: "工具" },
  { href: "/wallet", label: "钱包" },
  { href: "/docs", label: "API" },
] as const;
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--neutral-1)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-8 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${brand.name} Forge 首页`}
        >
          <BrandLogo variant="mark" className="h-8 w-8 sm:hidden" />
          <BrandLogo variant="horizontal" className="hidden h-[26px] w-auto sm:block" />
          <span className="hidden h-4 w-px bg-[var(--neutral-6)] sm:block" aria-hidden />
          <ForgeMark className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="sr-only">Forge</span>
        </Link>
        <nav aria-label="主导航" className="flex min-w-0 flex-1 items-center gap-1">
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
                  "shrink-0 px-3 py-2 text-[13px]",
                  active ? "font-medium text-[var(--neutral-12)]" : "text-[var(--neutral-11)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a
              href={process.env.NEXT_PUBLIC_ROUTER_URL ?? "http://localhost:3106"}
              className="inline-flex items-center gap-1.5"
            >
              <RouterMark className="h-4 w-4" />
              Router
            </a>
          </Button>
          <AuthActions />
        </div>
      </div>
    </header>
  );
}
