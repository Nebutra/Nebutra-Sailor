import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { MarketLocalePicker } from "@/components/ui/market-locale-picker";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Link } from "@/i18n/navigation";
import { REPO_URL } from "@/nebutra/data/repo";
import { ROUTES } from "@/nebutra/routes";
import { ThemedLogo } from "@/nebutra/shell/themed-logo";

/**
 * Nebutra's own footer — the company, its products, its writing, the legal line.
 *
 * The locale arrives as a prop from the layout's params. `getLocale()` here
 * ran in a layout that never set the request locale, so next-intl fell back
 * to reading request headers — runtime data in every prerender, which failed
 * the production build on the first route it reached (/blog, /refer).
 */
export async function SiteFooter({ lang }: { lang?: string }) {
  // An explicit locale: this renders in a layout that never sets the request
  // locale, and reading it from the request is runtime data in a prerender.
  const t = await getTranslations({ locale: lang ?? "en", namespace: "siteShell.footer" });
  const cols = [
    {
      k: t("read"),
      links: [
        { label: t("journal"), href: ROUTES.journal },
        { label: t("changelog"), href: "/changelog" },
      ],
    },
    {
      k: t("build"),
      links: [
        { label: "Sailor", href: ROUTES.sailor },
        { label: "GitHub", href: REPO_URL },
        { label: t("whatWeAreBuilding"), href: ROUTES.building },
        { label: t("status"), href: `https://status.${brand.domains.landing}` },
      ],
    },
    {
      k: t("company"),
      links: [
        { label: t("about"), href: ROUTES.company },
        {
          label: t("writeToFounder"),
          href: `mailto:tseka@${brand.domains.landing}`,
        },
        { label: t("privacy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
        // MiSans licence: the product states it uses MiSans — on /credits.
        { label: t("credits"), href: "/credits" },
      ],
    },
  ];
  return (
    <footer data-testid="site-footer" className="border-t border-border px-8 pt-16 pb-10 xl:px-16">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 md:col-span-1">
          <ThemedLogo size={112} />
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        <nav
          aria-label="Footer"
          className="col-span-2 grid grid-cols-2 gap-10 md:col-span-3 md:grid-cols-subgrid"
        >
          {cols.map((c) => (
            <div key={c.k}>
              <p className="text-sm text-foreground">{c.k}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {/^https?:/.test(l.href) ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>
          © 2026 {brand.nameFullEn} · {brand.nameFull}
        </span>
        <span className="flex flex-wrap items-center gap-4">
          {/* ICP 备案 — required for a site operated in mainland China */}
          {process.env.NEXT_PUBLIC_ICP_NUMBER ? (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {process.env.NEXT_PUBLIC_ICP_NUMBER}
            </a>
          ) : null}
          <MarketLocalePicker />
          <ThemeSwitcher />
        </span>
      </div>
    </footer>
  );
}
