import { ArrowRight } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-marks";
import { CodeSample } from "@/components/code-sample";
import { ModelTable } from "@/components/model-table";
import { SearchForm } from "@/components/search-form";
import { type ListingModel, type ListingProvider, PROVIDER_LABEL } from "@/lib/listing-catalog";

const FEATURED = 10;

/**
 * Public home — search first, then the shelf as data.
 *
 * It replaced a portal: category rail with hover flyouts, an illustrated
 * carousel, a greeting panel and pastel-covered cards. A buyer arrives to find
 * a model and its price; this page answers that above the fold, the way
 * OpenRouter and Vercel AI Gateway do. Server-rendered: the only client code
 * is the search field's submit and the copy button.
 *
 * Every number here is counted from the catalogue on the request.
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

  return (
    <div className="router-market-shell pb-20">
      <section className="grid gap-10 pt-14 pb-16 md:pt-20 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="min-w-0">
          <h1 className="max-w-[16ch] text-4xl font-semibold text-balance md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-[46ch] text-base text-pretty text-muted-foreground md:text-lg">
            {t("hero.subtitle", { models: models.length, providers: providers.length })}
          </p>
          <SearchForm
            className="mt-8 max-w-lg"
            placeholder={t("hero.searchPlaceholder")}
            label={t("hero.searchLabel")}
            submitLabel={t("hero.searchSubmit")}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/keys">{t("hero.getKey")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/docs">{t("hero.readDocs")}</Link>
            </Button>
          </div>
        </div>
        <CodeSample
          title={t("hero.codeTitle")}
          code={[
            `curl ${baseUrl}/chat/completions \\`,
            `  -H "Authorization: Bearer $ROUTER_API_KEY" \\`,
            `  -H "Content-Type: application/json" \\`,
            "  -d '{",
            `    "model": "${sampleModel}",`,
            `    "messages": [{ "role": "user", "content": "Hello" }]`,
            "  }'",
          ].join("\n")}
        />
      </section>

      <section aria-labelledby="home-models">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="home-models" className="text-xl font-semibold">
              {t("home.modelsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("home.modelsSubtitle", { live: live.length })}
            </p>
          </div>
          <Link
            href="/models"
            className="group inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("home.allModels", { count: models.length })}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <ModelTable models={featured} caption={t("home.modelsTitle")} />
      </section>

      {providers.length > 0 ? (
        <section aria-labelledby="home-providers" className="mt-16">
          <h2 id="home-providers" className="text-xl font-semibold">
            {t("home.providersTitle")}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {providers.map(([provider, count]) => (
              <li key={provider}>
                <Link
                  href={`/models?brand=${provider}`}
                  className="flex h-full items-center gap-3 rounded-[var(--radius-lg)] border border-border px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50"
                >
                  <BrandMark provider={provider} size={16} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {PROVIDER_LABEL[provider]}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {t("home.providerCount", { count })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
