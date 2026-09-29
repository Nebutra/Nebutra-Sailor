"use client";

import { BrandMark, BrandWordmark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { useLocale } from "next-intl";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { SITE } from "@/content/site";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { hereOnly } from "@/site-map";
import { say } from "./starter-copy";
import { StarterLink } from "./starter-link";

/** Brand, tagline, the link columns from SITE.footer (served pages only), theme and copyright. */
export function StarterFooter({ variant = "default" }: { variant?: "default" | "legal" }) {
  const locale = useLocale();
  const { footer } = SITE;
  // `new Date()` is an "unstable value" under Next 16 cacheComponents when read
  // during a Client Component's render — it makes the prerendered shell
  // non-deterministic. Same `useMount` gate FooterMinimal uses for
  // hydration-unsafe values: resolve the year only once mounted client-side,
  // so the prerendered shell and the first client render agree (both omit
  // it), and it fills in right after — fine for a copyright year that is
  // never load-bearing content.
  const isMounted = useMount();
  const year = isMounted ? new Date().getFullYear() : null;
  const columns = footer.columns
    .map((column) => ({ ...column, links: hereOnly(column.links) }))
    .filter((column) => column.links.length > 0);

  return (
    <footer className="border-t border-border bg-background px-4 md:px-6">
      {variant === "default" ? (
        <div className="mx-auto grid max-w-wide gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-foreground"
              aria-label={brand.name}
            >
              <BrandMark size={24} />
              <BrandWordmark height={18} />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">{say(footer.tagline, locale)}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title.en} aria-label={say(column.title, locale)}>
              <p className="text-sm font-medium text-foreground">{say(column.title, locale)}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <StarterLink
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {say(link.label, locale)}
                    </StarterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      ) : null}
      <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 border-t border-border py-6 first:border-t-0">
        <p className="text-sm text-muted-foreground">
          © {year ?? ""} {brand.nameFull || brand.name}. {say(footer.rights, locale)}
        </p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
