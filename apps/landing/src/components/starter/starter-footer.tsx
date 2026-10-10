"use client";

import { BrandMark, BrandWordmark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { SITE, type SiteTranslator } from "@/content/site";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { hereOnly } from "@/site-map";
import { StarterLink } from "./starter-link";

/** Brand, tagline, the link columns from SITE.footer (served pages only), theme and copyright. */
export function StarterFooter({ variant = "default" }: { variant?: "default" | "legal" }) {
  const t = useTranslations("site.footer") as unknown as SiteTranslator;
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
    <footer className="border-t border-border bg-background">
      {variant === "default" ? (
        <div className="mx-auto grid max-w-wide gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
          <div className="max-w-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-foreground"
              aria-label={brand.name}
            >
              <BrandMark size={24} />
              <BrandWordmark height={18} />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.id} aria-label={t(`columns.${column.id}.title`)}>
              <p className="text-sm font-medium text-foreground">
                {t(`columns.${column.id}.title`)}
              </p>
              <ul className="mt-2 md:mt-4 md:space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <StarterLink
                      href={link.href}
                      className="inline-flex min-h-10 items-center text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground md:min-h-0"
                    >
                      {t(`columns.${column.id}.links.${link.id}`)}
                    </StarterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      ) : null}
      <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-6 first:border-t-0 md:px-6">
        <p className="text-sm text-muted-foreground">
          © {year ?? ""} {brand.nameFull || brand.name}. {t("rights")}
        </p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
