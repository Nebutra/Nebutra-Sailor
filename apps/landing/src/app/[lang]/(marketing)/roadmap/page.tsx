import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  BETS,
  DIRECTION_ESSAY,
  HORIZONS,
  LANDED,
  LAYERS,
  type LayerId,
  NINE_LAYERS_ESSAY,
  prUrl,
} from "@/nebutra/data/roadmap";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "roadmapPage" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/roadmap", {
      description: t("meta.description"),
    }),
  );
}

const layerNo = (id: LayerId) => id.slice(1);
const layerName = (id: LayerId) => LAYERS.find((l) => l.id === id)?.name.en ?? "";

/** "Serves L5 · Product" — a link down to the layer a piece of work answers to. */
function Serves({ id }: { id: LayerId }) {
  return (
    <a
      href={`#${id}`}
      className="text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
    >
      L{layerNo(id)} · {layerName(id)}
    </a>
  );
}

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function RoadmapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "roadmapPage" });
  const months = [...new Set(LANDED.map((l) => l.month))];

  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title={t("hero.title")}
          lead={t("hero.lead")}
          cn={zh ? undefined : t("hero.cn")}
        />
        <Link
          href={NINE_LAYERS_ESSAY}
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("hero.essayLink")}
        </Link>
      </section>

      <Band>
        <Intro
          title={t("direction.title")}
          lead={t("direction.lead")}
          cn={zh ? undefined : t("direction.cn")}
        />
        <ol className="mt-12 max-w-content divide-y divide-border border-y border-border">
          {LAYERS.map((layer) => (
            <li
              key={layer.id}
              id={layer.id}
              className="grid scroll-mt-24 grid-cols-1 gap-3 py-8 md:grid-cols-[4rem_10rem_minmax(0,1fr)] md:gap-8"
            >
              <span className="text-sm text-muted-foreground tabular-nums">
                L{layerNo(layer.id)}
              </span>
              <span className="flex items-baseline gap-2 md:flex-col md:gap-1">
                <span className="text-base text-foreground">{layer.name.en}</span>
                <span className="text-sm text-muted-foreground">{layer.name.zh}</span>
              </span>
              <div className="max-w-2xl">
                <p className="font-heading text-2xl text-balance text-foreground">{layer.line}</p>
                {layer.also ? (
                  <p className="mt-3 text-base text-muted-foreground">{layer.also}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <Link
          href={DIRECTION_ESSAY.href}
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {DIRECTION_ESSAY.title} →
        </Link>
      </Band>

      <Band>
        <Intro
          title={t("execution.title")}
          lead={t("execution.lead")}
          cn={zh ? undefined : t("execution.cn")}
        />
        <div className="mt-12 grid max-w-wide grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-10">
          {HORIZONS.map((h) => (
            <section key={h.id} aria-labelledby={`horizon-${h.id}`}>
              <div className="border-b border-border pb-4">
                <h3
                  id={`horizon-${h.id}`}
                  className="flex items-baseline gap-3 font-heading text-2xl text-foreground"
                >
                  {h.en}
                  <span className="font-sans text-sm text-muted-foreground">{h.zh}</span>
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{h.is}</p>
              </div>
              <ul className="divide-y divide-border">
                {BETS.filter((b) => b.horizon === h.id).map((bet) => (
                  <li key={bet.title} className="py-6">
                    {bet.href ? (
                      <Link
                        href={bet.href}
                        className="text-base text-foreground underline-offset-4 hover:underline"
                      >
                        {bet.title}
                      </Link>
                    ) : (
                      <p className="text-base text-foreground">{bet.title}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{bet.what}</p>
                    <p className="mt-3">
                      <Serves id={bet.serves} />
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Band>

      <Band>
        <Intro
          title={t("landed.title")}
          lead={t("landed.lead")}
          cn={zh ? undefined : t("landed.cn")}
        />
        <div className="mt-12 flex max-w-content flex-col gap-12">
          {months.map((month) => (
            <section key={month} aria-label={monthLabel(month)}>
              <h3 className="text-sm text-muted-foreground">{monthLabel(month)}</h3>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {LANDED.filter((l) => l.month === month).map((item) => (
                  <li
                    key={item.title}
                    className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_9rem_8rem] sm:items-baseline sm:gap-6"
                  >
                    <span className="text-base text-foreground">{item.title}</span>
                    <Serves id={item.serves} />
                    <span className="flex gap-3 text-sm tabular-nums sm:justify-end">
                      {item.prs.map((n) => (
                        <a
                          key={n}
                          href={prUrl(n)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors duration-micro hover:text-foreground"
                        >
                          #{n}
                        </a>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <Link
          href="/changelog"
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("landed.releaseNotes")}
        </Link>
      </Band>
    </main>
  );
}
