import { ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-marks";
import { ModelTable } from "@/components/model-table";
import { RequestPreview } from "@/components/request-preview";
import { SearchForm } from "@/components/search-form";
import {
  type ListingModel,
  type ListingProvider,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

const FEATURED = 8;

/**
 * Public home.
 *
 * Composition follows the funded AI product sites we benchmarked (Vercel AI
 * Gateway, Linear, Modal, OpenRouter): a display headline with real scale
 * contrast, the product itself as the hero — a request and its streamed reply
 * on a lit surface — one light source in the House blue, provider marks as a
 * set, numbers as heroes, then the shelf as data.
 *
 * Every number is counted from the catalogue on the request; nothing is a
 * marketing figure. The only client code is the preview's stream and the
 * copy buttons.
 */
export function MarketHome({
  models,
  baseUrl,
  sampleModel,
}: {
  models: readonly ListingModel[];
  baseUrl: string;
  sampleModel: string;
}) {
  const t = useTranslations("shelf");

  const live = models.filter((m) => m.sellable || m.routed);
  const featured = [...live, ...models.filter((m) => !(m.sellable || m.routed))].slice(0, FEATURED);

  const byProvider = new Map<ListingProvider, number>();
  for (const m of models) byProvider.set(m.provider, (byProvider.get(m.provider) ?? 0) + 1);
  const providers = [...byProvider.entries()]
    .filter(([p]) => p !== "other")
    .sort((a, b) => b[1] - a[1]);

  // One sellable model per provider, the default first: the chips in the
  // preview are models the shelf really lists.
  const samples: Array<{ model: string; provider: ListingProvider }> = [];
  const seen = new Set<ListingProvider>();
  const pool = [...live.filter((m) => m.publicModel === sampleModel), ...live, ...models];
  for (const m of pool) {
    const p = resolveListingProvider(m);
    if (seen.has(p) || p === "other") continue;
    seen.add(p);
    samples.push({ model: m.publicModel, provider: p });
    if (samples.length === 3) break;
  }

  const stats = [
    { value: String(models.length), label: t("stats.models") },
    { value: String(providers.length), label: t("stats.providers") },
    { value: String(live.length), label: t("stats.live") },
    { value: "1", label: t("stats.endpoint") },
  ];

  return (
    <div className="pb-24">
      <section className="router-glow">
        <div aria-hidden className="router-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="router-market-shell grid gap-12 pt-16 pb-14 md:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center lg:gap-16">
          <AnimateIn preset="emerge">
            <Link
              href="/models"
              className="group inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background/70 pr-3 pl-2.5 text-xs text-muted-foreground shadow-glass-sm backdrop-blur transition-colors hover:text-foreground"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-ring" />
              {t("hero.eyebrow", { count: live.length })}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <h1 className="mt-6 max-w-[14ch] text-5xl text-balance md:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-pretty text-muted-foreground">
              {t("hero.subtitle", { models: models.length, providers: providers.length })}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="shadow-sheen">
                <Link href="/keys">
                  {t("hero.getKey")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/docs">{t("hero.readDocs")}</Link>
              </Button>
            </div>
          </AnimateIn>
          <AnimateIn preset="emerge" delay={0.12}>
            <RequestPreview baseUrl={baseUrl} samples={samples} reply={t("preview.reply")} />
          </AnimateIn>
        </div>

        {providers.length > 0 ? (
          <div className="router-market-shell pb-2">
            <p className="text-center text-xs text-muted-foreground">{t("home.routedTo")}</p>
            {/* Provider marks as one set: same size, same grey, colour on hover only. */}
            <ul
              className="mt-5 grid border-y border-border"
              style={{
                gridTemplateColumns: `repeat(${Math.min(providers.length, 6)}, minmax(0, 1fr))`,
              }}
            >
              {providers.slice(0, 6).map(([provider, count], i) => (
                <li key={provider} className={i > 0 ? "border-l border-border" : ""}>
                  <Link
                    href={`/models?brand=${provider}`}
                    aria-label={t("home.providerLink", {
                      provider: PROVIDER_LABEL[provider],
                      count,
                    })}
                    className="group flex h-24 flex-col items-center justify-center gap-1.5 text-foreground/75 transition-colors hover:bg-muted/40 hover:text-foreground md:flex-row md:gap-3"
                  >
                    <span className="opacity-60 grayscale transition-[filter,opacity] group-hover:opacity-100 group-hover:grayscale-0">
                      <BrandMark provider={provider} size={22} />
                    </span>
                    <span className="text-sm font-medium md:text-base">
                      {PROVIDER_LABEL[provider]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-label={t("stats.label")} className="router-market-shell mt-16">
        {/* Numbers as the heroes of the section: counted from the shelf on this request. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-2">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="text-5xl tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="home-models" className="router-market-shell mt-20">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="home-models" className="text-3xl">
              {t("home.modelsTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("home.modelsSubtitle", { live: live.length })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SearchForm
              className="w-full md:w-80"
              placeholder={t("hero.searchPlaceholder")}
              label={t("hero.searchLabel")}
              submitLabel={t("hero.searchSubmit")}
            />
          </div>
        </div>
        <ModelTable models={featured} caption={t("home.modelsTitle")} />
        <div className="mt-4 flex justify-end">
          <Link
            href="/models"
            className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("home.allModels", { count: models.length })}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}
