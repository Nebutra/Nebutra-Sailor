import { DottedMap } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Intro } from "@/nebutra/ui/page";

/** Wuxi, where the company is registered. The only marker: we mark where we are, not where we wish we were. */
const HOME = { lat: 31.49, lng: 120.31, size: 1.1 };

/** Each served locale, named in its own language — the list is the routing table, not a claim. */
function endonyms(): string[] {
  return routing.locales.map((locale) => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
    } catch {
      return locale;
    }
  });
}

/**
 * The second line of business: enterprise AI R&D and taking products global.
 * The proof it can show without a client list is this site itself — the
 * language list below is read from the router that serves the page.
 *
 * Responsive: Stack. Copy beside the map from lg up; map under the copy below.
 */
export async function Practice({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors.practice" });
  const names = endonyms();
  return (
    <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div>
        <Intro title={t("title")} lead={t("lead")} />
        <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {(["rnd", "global"] as const).map((k) => (
            <div key={k} className="border-t border-border pt-5">
              <dt className="text-base text-foreground">{t(`${k}.title`)}</dt>
              <dd className="mt-2 text-sm text-muted-foreground text-pretty">{t(`${k}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figure>
        <div className="aspect-[2/1] w-full text-border">
          <DottedMap
            mapSamples={2600}
            dotRadius={0.28}
            markers={[HOME]}
            markerColor="hsl(var(--ring))"
          />
        </div>
        <figcaption className="mt-6">
          <p className="text-sm text-foreground">
            {t("locales", { count: names.length })} {t("hq")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {names.map((n) => (
              <li key={n}>
                <bdi>{n}</bdi>
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
    </div>
  );
}
