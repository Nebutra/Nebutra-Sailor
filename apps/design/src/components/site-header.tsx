"use client";

/**
 * Identity, search, the way home, the theme. Nothing else.
 *
 * The bar used to carry the design-language row as well — nine pills and a mono
 * label beside the search field — which made the most important control on the
 * site read as header clutter. It now lives at the top of the sidebar, where it
 * has room to show what each language is; the header is left with the four
 * things every docs header has, in the order every docs header has them.
 *
 * Full-bleed, with the brand column the same width as the sidebar beneath it, so
 * the mark sits over the inventory it names.
 */

import { BrandMark, WordmarkEnSVG } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowUpRight, LogoGithub } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { Button, ThemeToggle } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMounted } from "@/lib/use-mounted";

export function SiteHeader({ search, menu }: { search: ReactNode; menu: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    // Geist's bar: 64px, a hairline under it, the brand cell exactly the rail's
    // width with the rail's own hairline continuing up through it, so the mark
    // sits over the inventory it names and the search starts where the article
    // starts.
    <header className="sticky top-0 z-30 border-border border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center">
        <div className="flex h-full min-w-0 items-center gap-2 pl-4 md:pl-6 lg:w-64 lg:shrink-0 lg:border-border lg:border-r lg:px-6">
          {menu}
          <Link
            aria-label={`${brand.name} Design — home`}
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] text-foreground no-underline"
            href="/"
          >
            <BrandMark size={22} />
            <WordmarkEnSVG aria-hidden className="h-[13px] w-auto text-foreground" />
            <span className="font-medium text-muted-foreground text-sm">Design</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 pr-4 md:pr-6 lg:justify-between lg:pl-12">
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
