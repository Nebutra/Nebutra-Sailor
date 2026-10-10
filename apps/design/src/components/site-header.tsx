"use client";

/**
 * Identity and scope on the left, search and the way out on the right.
 *
 * The left is a breadcrumb in the shape of Vercel's dashboard scope switcher:
 * "[mark] Design / Factory ⌄". The design language is the scope every page is
 * rendered in, so it is named where a scope is named, and the last crumb is the
 * one that switches it. It used to be nine pills here, then a boxed field at
 * the top of the sidebar; as a crumb it is one control, in one place, on every
 * width — narrow screens drop the wordmark, not the switcher.
 */

import { BrandMark, WordmarkEnSVG } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowUpRight, LogoGithub } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { Button, ThemeToggle } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useMounted } from "@/lib/use-mounted";

export function SiteHeader({ search, menu }: { search: ReactNode; menu: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    // Geist's bar: 64px with a hairline under it. The left is a breadcrumb in
    // the shape of Vercel's dashboard scope ("team / project ⌄"), the right is
    // search and the way out.
    <header className="sticky top-0 z-30 border-border border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* Vercel's scope breadcrumb: mark, product, then the scope the page is
            shown in — "Design / Factory" — with the last crumb the one
            that switches. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {menu}
          <Link
            aria-label={`${brand.name} Design — home`}
            className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-sm)] text-foreground no-underline"
            href="/"
          >
            <BrandMark size={22} />
            <WordmarkEnSVG
              aria-hidden
              className="hidden h-[13px] w-auto text-foreground sm:block"
            />
            <span className="hidden font-medium text-muted-foreground text-sm sm:inline">
              Design
            </span>
          </Link>
          <span aria-hidden className="select-none px-1 text-lg text-neutral-6 sm:px-2">
            /
          </span>
          <LanguageSwitcher shortcut />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden w-64 lg:block">{search}</div>
          <div className="lg:hidden">{search}</div>

          <nav aria-label="Elsewhere" className="flex items-center gap-1">
            <a
              className="hidden items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground text-sm no-underline transition-colors duration-micro hover:text-foreground sm:inline-flex"
              href={getBrandOrigin("landing")}
            >
              {brand.domains.landing}
              <ArrowUpRight aria-hidden className="size-3" />
            </a>
            <Button
              aria-label="GitHub"
              asChild
              iconSize="md"
              shape="square"
              variant="ghost"
              className="hidden text-muted-foreground sm:inline-flex"
            >
              <a href={brand.social.github} rel="noreferrer" target="_blank">
                <LogoGithub aria-hidden className="size-4" />
              </a>
            </Button>
            {/* The stored theme is only known in the browser; a same-size
                placeholder holds the slot until then so nothing shifts. */}
            {mounted ? (
              <ThemeToggle
                className="text-muted-foreground"
                onValueChange={(value) => setTheme(value)}
                size="sm"
                value={resolvedTheme}
              />
            ) : (
              <span aria-hidden className="inline-block size-8" />
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
