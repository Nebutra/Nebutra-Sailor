import {
  PROVIDERS_BY_CATEGORY,
  type ProviderCategory,
  type ProviderMeta,
} from "@nebutra/ai-providers";
import { AnimateIn } from "@nebutra/ui/components";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

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
  return {
    title: "Supported AI Providers & Models — Nebutra",
    description:
      "AI provider metadata for every major LLM lab, China platform, gateway, and local runtime — wired through Vercel AI SDK. Swap providers with one env var.",
    alternates: { canonical: `/${lang}/ai/models` },
  };
}

const CATEGORY_LABEL_EN: Record<ProviderCategory, string> = {
  直接实验室: "Direct Labs",
  国内平台: "China Platforms",
  云平台: "Cloud Platforms",
  推理加速: "Inference Accelerators",
  统一网关: "Unified Gateways",
  多模态: "Multimodal",
  本地部署: "Local Deployment",
  开发者生态: "Developer Ecosystem",
};

const STATUS_LABEL: Record<ProviderMeta["status"], string> = {
  opencode: "Production",
  "ai-sdk": "AI SDK",
  "cn-compatible": "Compatible",
  pending: "Pending",
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
  const isZh = locale === "zh";

  const categories = Object.entries(PROVIDERS_BY_CATEGORY) as [ProviderCategory, ProviderMeta[]][];
  const total = categories.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <Suspense>
      <main id="main-content" className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <section className="container mx-auto max-w-[1400px] px-4 py-32">
          <AnimateIn preset="emerge" className="mb-16 max-w-4xl">
            <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
              AI Providers
            </p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-balance">
              {total} AI providers. One adapter.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Sailor ships with provider metadata for every major LLM lab, China platform, gateway,
              and local runtime — wired through Vercel AI SDK. Swap providers with one env var.
            </p>
          </AnimateIn>

          <div className="space-y-16">
            {categories.map(([category, providers]) => (
              <section key={category}>
                <AnimateIn preset="fadeUp">
                  <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-baseline gap-3">
                    <span>{isZh ? category : (CATEGORY_LABEL_EN[category] ?? category)}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {providers.length} {providers.length === 1 ? "provider" : "providers"}
                    </span>
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {providers.map((p) => (
                      <a
                        key={p.id}
                        href={p.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-2xl border border-border bg-card/30 p-5 hover:border-primary/40 hover:bg-card/50 transition-colors"
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
                            {STATUS_LABEL[p.status]}
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
        <FooterMinimal />
      </main>
    </Suspense>
  );
}
