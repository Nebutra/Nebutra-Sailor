import { getTranslations } from "next-intl/server";
import { siteLang } from "@/nebutra/i18n";
import { RevealGroup } from "@/shared/animation/reveal-group";
import { BrowserFrame } from "./browser-frame";
import { ALSO_ON_PLATFORM, SHOWCASE } from "./showcase";

/** Column spans for the four shots: wide-narrow, then narrow-wide. One dominant tile per row. */
const SPAN = [
  "lg:col-span-7",
  "lg:col-span-5 lg:mt-24",
  "lg:col-span-5",
  "lg:col-span-7 lg:mt-12",
] as const;

/**
 * The products, shown as the live sites they are. Every tile is a link to the
 * production domain printed in its chrome; nothing here is a mock.
 *
 * Responsive: Stack. A staggered 12-column grid from lg up; a single column
 * of full-width frames below it.
 */
export async function ProductGallery({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors.products" });
  const zh = siteLang(lang) === "zh";
  return (
    <>
      <RevealGroup
        as="ul"
        className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-16"
      >
        {SHOWCASE.map((p, i) => (
          <li key={p.id} className={SPAN[i]}>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("open", { name: p.name })}
              className="group block"
            >
              <BrowserFrame
                domain={p.domain}
                shot={p.shot}
                alt={p.name}
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
              <div className="mt-4 flex items-baseline justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-base text-foreground" translate="no">
                    {p.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{t(p.id)}</p>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 text-sm text-muted-foreground transition-colors duration-micro group-hover:text-foreground"
                >
                  ↗
                </span>
              </div>
            </a>
          </li>
        ))}
      </RevealGroup>
      <p className="mt-10 text-sm text-muted-foreground">{t("caption")}</p>
      {ALSO_ON_PLATFORM.length ? (
        <div className="mt-12 max-w-4xl">
          <p className="text-sm text-foreground">{t("also")}</p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {ALSO_ON_PLATFORM.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
              >
                <span className="text-base text-foreground" translate="no">
                  {p.name}
                </span>
                <span className="text-sm text-muted-foreground">{zh ? p.whatZh : p.what}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
