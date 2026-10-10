import { DottedMap, Heading } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { KCQ_SITE, offering } from "@/nebutra/data/offerings";
import { BrowserFrame } from "@/nebutra/investors/browser-frame";
import { ACME_SHOT, SHOWCASE } from "@/nebutra/investors/showcase";
import { ACME_SITE } from "@/nebutra/routes";
import { LayerTags } from "@/nebutra/ui/layer-tags";
import { More } from "@/nebutra/ui/page";

/** Wuxi, where the company is registered — the one marker on the consulting map. */
const HOME = { lat: 31.49, lng: 120.31, size: 1.1 };

const KCQ_SHOT = SHOWCASE.find((s) => s.id === "kcq")?.shot;

/**
 * The home page's first section under the hero: the two businesses, each with
 * a real artifact (the deployed Sailor template; the map and the languages
 * this site is served in), then a smaller row for KCQ, incubated on Sailor.
 * Each one names the layers it answers to (LayerTags).
 *
 * Responsive: Stack. Two columns from md up; one below.
 */
export async function Offerings({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.home.offer" });
  const sailor = offering("sailor");
  const consulting = offering("consulting");
  const kcq = offering("kcq");
  return (
    <>
      <ul className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-10">
        <li className="flex flex-col">
          <a href={ACME_SITE} target="_blank" rel="noopener noreferrer" className="group block">
            <BrowserFrame
              domain={new URL(ACME_SITE).host}
              shot={ACME_SHOT}
              alt={t("sailor.alt")}
              sizes="(min-width: 768px) 45vw, 100vw"
              priority
            />
          </a>
          <Heading level={3} className="mt-8">
            Sailor
          </Heading>
          <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
            {t("sailor.body")}
          </p>
          <p className="mt-4 font-mono text-sm text-secondary-foreground" translate="no">
            npx create-sailor
          </p>
          <LayerTags lang={lang} serves={sailor.serves} className="mt-6" />
          <More href={sailor.href}>{t("sailor.cta")}</More>
        </li>
        <li className="flex flex-col">
          <figure className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            <div className="aspect-[16/10] w-full p-6 text-border">
              <DottedMap
                mapSamples={2600}
                dotRadius={0.28}
                markers={[HOME]}
                markerColor="hsl(var(--ring))"
              />
            </div>
            <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {t("consulting.caption", { count: routing.locales.length })}
            </figcaption>
          </figure>
          <Heading level={3} className="mt-8">
            {t("consulting.title")}
          </Heading>
          <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
            {t("consulting.body")}
          </p>
          <LayerTags lang={lang} serves={consulting.serves} className="mt-6" />
          <More href={consulting.href}>{t("consulting.cta")}</More>
        </li>
      </ul>

      {/* Incubated on Sailor: smaller, a proof that the platform carries a live product. */}
      <div className="mt-24 grid grid-cols-1 items-center gap-8 border-t border-border pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
        {KCQ_SHOT ? (
          <a href={KCQ_SITE} target="_blank" rel="noopener noreferrer" className="group block">
            <BrowserFrame
              domain={new URL(KCQ_SITE).host}
              shot={KCQ_SHOT}
              alt="KCQ"
              sizes="(min-width: 768px) 30vw, 100vw"
            />
          </a>
        ) : null}
        <div>
          <p className="text-sm text-muted-foreground">{t("incubated.label")}</p>
          <p className="mt-2 font-heading text-2xl text-foreground" translate="no">
            KCQ
          </p>
          <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
            {t("incubated.kcq")}
          </p>
          <LayerTags lang={lang} serves={kcq.serves} className="mt-6" />
          <a
            href={KCQ_SITE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
          >
            {new URL(KCQ_SITE).host}
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </>
  );
}
