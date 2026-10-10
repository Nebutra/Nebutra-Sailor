"use client";

import { BrandMark, BrandWordmark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { Cross, Menu } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MarketLocalePicker } from "@/components/ui/market-locale-picker";
import { SITE, type SiteTranslator } from "@/content/site";
import { Link, usePathname } from "@/i18n/navigation";
import { usePublicMe } from "@/lib/use-public-me";
import { hereOnly } from "@/site-map";
import { StarterLink } from "./starter-link";

/**
 * The site's top bar: your brand, the pages in SITE.nav (only those this
 * site serves), the language picker and the way into the product app — "Sign
 * in" and "Get started", or "Open the app" once the visitor has a session.
 */
export function StarterNav() {
  const t = useTranslations("site.nav") as unknown as SiteTranslator;
  const tAccount = useTranslations("site.account");
  const pathname = usePathname();
  const me = usePublicMe();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = hereOnly(SITE.nav);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A navigation closes the mobile menu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change by design
  useEffect(() => setOpen(false), [pathname]);

  const accountLinks = me ? (
    <Button asChild size="sm" variant="ink">
      <StarterLink href="app:/welcome">{tAccount("open")}</StarterLink>
    </Button>
  ) : (
    <>
      <Button asChild size="sm" variant="ghost">
        <StarterLink href="app:/sign-in">{tAccount("signIn")}</StarterLink>
      </Button>
      <Button asChild size="sm" variant="ink">
        <StarterLink href="app:/sign-in?mode=sign-up">{tAccount("getStarted")}</StarterLink>
      </Button>
    </>
  );

  return (
    <header
      className={cn(
        // Always opaque: the page never shows through the bar. Scrolling only
        // adds the hairline that separates it from the content under it.
        "fixed inset-x-0 top-0 z-50 border-b bg-background transition-[border-color] duration-flow",
        scrolled || open ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-wide items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground" aria-label={brand.name}>
          <BrandMark size={24} />
          <BrandWordmark height={18} />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => (
            <StarterLink
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
            >
              {t(link.id)}
            </StarterLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <MarketLocalePicker />
          {accountLinks}
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          <MarketLocalePicker />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={tAccount("menu")}
            aria-expanded={open}
            aria-controls="starter-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <Cross aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div id="starter-mobile-menu" className="border-t border-border px-4 pt-2 pb-6 md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {links.map((link) => (
              <StarterLink
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center border-b border-border text-base text-foreground"
              >
                {t(link.id)}
              </StarterLink>
            ))}
          </nav>
          <div className="mt-5 flex flex-wrap gap-2 [&>*]:flex-1">{accountLinks}</div>
        </div>
      ) : null}
    </header>
  );
}
