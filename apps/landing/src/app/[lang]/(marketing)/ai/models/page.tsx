import {
  PROVIDERS_BY_CATEGORY,
  type ProviderCategory,
  type ProviderMeta,
} from "@nebutra/ai-providers";
import { External as ExternalLink } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLang } from "@/nebutra/i18n";

/** Reads a dynamic dotted path out of `modelsPage` — status/category are data-driven keys. */
type ModelsPageTranslator = (key: string, values?: Record<string, unknown>) => string;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "modelsPage" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/ai/models",
    locale: lang as Locale,
  });
}

/** `messages.modelsPage.categories` key for each data-side Chinese category label. */
const CATEGORY_KEY: Record<ProviderCategory, string> = {
  直接实验室: "directLabs",
  国内平台: "chinaPlatforms",
  云平台: "cloudPlatforms",
  推理加速: "inferenceAccelerators",
  统一网关: "unifiedGateways",
  多模态: "multimodal",
  本地部署: "localDeployment",
  开发者生态: "developerEcosystem",
};

const STATUS_CLASS: Record<ProviderMeta["status"], string> = {
  opencode: "bg-primary/10 text-primary",
  "ai-sdk": "bg-primary/10 text-primary",
  "cn-compatible": "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
};

export default async function ModelsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const isZh = siteLang(locale) === "zh";
  const t = (await getTranslations({
    locale,
    namespace: "modelsPage",
  })) as unknown as ModelsPageTranslator;

  const categories = Object.entries(PROVIDERS_BY_CATEGORY) as [ProviderCategory, ProviderMeta[]][];
  const total = categories.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <main id="main-content" className="flex flex-col flex-1 bg-background">
      <section className="container mx-auto max-w-wide px-4 py-32">
        <AnimateIn preset="emerge" className="mb-16 max-w-4xl">
          <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-semibold mb-6 text-balance"
            style={{
              letterSpacing: "var(--tracking-display)",
              lineHeight: "var(--leading-display)",
            }}
          >
            {t("title", { count: total })}
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">{t("lead")}</p>
        </AnimateIn>

        <div className="space-y-16">
          {categories.map(([category, providers]) => (
            <section key={category}>
              <AnimateIn preset="fadeUp">
                <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-baseline gap-3">
                  <span>{isZh ? category : t(`categories.${CATEGORY_KEY[category]}`)}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("providerCount", { count: providers.length })}
                  </span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {providers.map((p) => (
                    <a
                      key={p.id}
                      href={p.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-[var(--radius-2xl)] border border-border bg-card/30 p-5 hover:border-primary/40 hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-1" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}
                        >
                          {t(`status.${p.status}`)}
                        </span>
                        <code className="text-xs text-muted-foreground/80 font-mono">
                          {p.envVarPrefix}_API_KEY
                        </code>
                      </div>
                    </a>
                  ))}
                </div>
              </AnimateIn>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
