import { brand } from "@nebutra/brand/metadata";
import { Button, CopyButton } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-marks";
import { CodeSample } from "@/components/code-sample";
import { ModelTable } from "@/components/model-table";
import {
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

const SECTIONS = ["intro", "quickstart", "apis", "pricing", "related"] as const;

/**
 * The endpoints this model actually answers on.
 *
 * This was a hardcoded `/v1/chat/completions` for every model, which is wrong
 * for an image SKU: gpt-image-2.5 answers only on /v1/images/*, and a chat
 * call to it is refused. A detail page must never tell a customer to make a
 * request that cannot work. Mirrored in product-detail.test.ts.
 */
function endpointsFor(category: ListingModel["category"]) {
  if (category === "image") {
    return [
      { key: "imagesGenerate", path: "/v1/images/generations", method: "POST" },
      { key: "imagesEdit", path: "/v1/images/edits", method: "POST" },
    ];
  }
  if (category === "audio") {
    return [
      { key: "audioSpeech", path: "/v1/audio/speech", method: "POST" },
      { key: "audioTranscribe", path: "/v1/audio/transcriptions", method: "POST" },
    ];
  }
  if (category === "data") {
    return [{ key: "embeddings", path: "/v1/embeddings", method: "POST" }];
  }
  return [
    { key: "chat", path: "/v1/chat/completions", method: "POST" },
    // Streaming is the same endpoint with `stream: true`, listed separately
    // because a buyer scanning the table is looking for the word.
    { key: "chatStream", path: "/v1/chat/completions", method: "POST" },
    { key: "responses", path: "/v1/responses", method: "POST" },
  ];
}

/** A paste-ready first request for the model's primary endpoint. */
function sampleFor(model: ListingModel, baseUrl: string): string {
  const root = baseUrl.replace(/\/v1\/?$/, "");
  const head = (path: string) => [
    `curl ${root}${path} \\`,
    `  -H "Authorization: Bearer $ROUTER_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
  ];
  if (model.category === "image") {
    return [
      ...head("/v1/images/generations"),
      `  -d '{"model": "${model.publicModel}", "prompt": "A lighthouse at dusk"}'`,
    ].join("\n");
  }
  if (model.category === "data") {
    return [
      ...head("/v1/embeddings"),
      `  -d '{"model": "${model.publicModel}", "input": "Hello"}'`,
    ].join("\n");
  }
  if (model.category === "audio") {
    return [
      ...head("/v1/audio/speech"),
      `  -d '{"model": "${model.publicModel}", "input": "Hello", "voice": "alloy"}'`,
    ].join("\n");
  }
  return [
    ...head("/v1/chat/completions"),
    `  -d '{"model": "${model.publicModel}", "messages": [{"role": "user", "content": "Hello"}]}'`,
  ].join("\n");
}

/**
 * Model page — typographic header, a stat strip of the fields the catalogue
 * really has, then quickstart, endpoints and pricing, the order OpenRouter and
 * Hugging Face model cards use. Server-rendered; the copy buttons are the only
 * client code.
 *
 * It replaced a pastel provider cover, a duplicated price panel and an
 * illustrated playground placeholder.
 */
export function ProductDetail({
  model,
  related,
  baseUrl,
}: {
  model: ListingModel;
  related: readonly ListingModel[];
  baseUrl: string;
}) {
  const t = useTranslations("detail");
  const tShelf = useTranslations("shelf");
  const tCat = useTranslations("category");
  const provider = resolveListingProvider(model);
  const providerLabel = PROVIDER_LABEL[provider];
  const categoryLabel = tCat(model.category);
  const live = model.sellable || model.routed;
  const apis = endpointsFor(model.category);
  const input = formatPrice(model.inputPerMTok);
  const output = formatPrice(model.outputPerMTok);

  const blurb =
    model.description && model.description !== model.publicModel
      ? model.description
      : model.context
        ? t("blurb", { provider: providerLabel, category: categoryLabel, context: model.context })
        : t("blurbNoContext", { provider: providerLabel, category: categoryLabel });

  const intro = [
    t("intro.what", { model: model.publicModel, provider: providerLabel, category: categoryLabel }),
    t("intro.how", { brandName: brand.name }),
    live ? t("intro.live") : t("intro.catalog"),
  ].join(" ");

  const capabilities: Array<{ title: string; body: string }> = [
    { title: t("cap.unifiedTitle"), body: t("cap.unifiedBody") },
    { title: t("cap.meteredTitle"), body: t("cap.meteredBody", { input, output }) },
  ];
  // An unknown window is left out, not printed as "about —".
  if (model.context) {
    capabilities.push({
      title: t("cap.contextTitle"),
      body: t("cap.contextBody", { context: model.context }),
    });
  }
  if (model.category === "reasoning") {
    capabilities.push({ title: t("cap.reasoningTitle"), body: t("cap.reasoningBody") });
  }
  if (model.category === "multimodal" || model.category === "image") {
    capabilities.push({ title: t("cap.multimodalTitle"), body: t("cap.multimodalBody") });
  }

  const forAi = [
    // Pasted into an AI assistant: kept in English, the lingua franca of model docs.
    `Model: ${model.publicModel}`,
    `Provider: ${providerLabel}`,
    `Category: ${model.category}`,
    `Input: ${input}/1M`,
    `Output: ${output}/1M`,
    `Context: ${model.context || "—"}`,
    `Endpoint: ${brand.name} Router OpenAI-compatible ${apis[0]?.path ?? "/v1/chat/completions"}`,
  ].join("\n");

  const stats: Array<{ label: string; value: string; text?: boolean }> = [
    { label: tShelf("col.input"), value: input },
    { label: tShelf("col.output"), value: output },
    { label: tShelf("col.context"), value: model.context || "—" },
    { label: t("status"), value: live ? t("sellable") : t("catalogOnly"), text: true },
  ];

  const sectionTitle = "scroll-mt-24 text-lg font-semibold tracking-tight";

  return (
    <div className="router-market-shell pt-6 pb-16 md:pt-8">
      <nav aria-label={t("breadcrumb")} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/models" className="transition-colors hover:text-foreground">
              {tShelf("nav.models")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/models?brand=${encodeURIComponent(provider)}`}
              className="transition-colors hover:text-foreground"
            >
              {providerLabel}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="truncate text-foreground">
            {model.publicModel}
          </li>
        </ol>
      </nav>

      <header className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card">
              <BrandMark provider={provider} size={22} />
            </span>
            <h1 className="min-w-0 truncate font-mono text-2xl font-semibold tracking-tight md:text-3xl">
              {model.publicModel}
            </h1>
            <CopyButton value={model.publicModel} aria-label={t("copyId")} />
          </div>
          <p className="mt-3 max-w-2xl text-sm text-pretty text-muted-foreground md:text-base">
            {blurb}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <CopyButton
            value={forAi}
            label={t("copyForAi")}
            copiedLabel={t("copied")}
            variant="outline"
          />
          <Button asChild variant="outline">
            <Link href="/docs">{t("docs")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/use?model=${encodeURIComponent(model.publicModel)}`}>{t("tryIt")}</Link>
          </Button>
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-background px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd
              className={
                s.text
                  ? "mt-1 text-base font-medium"
                  : "mt-1 font-mono text-base font-medium tabular-nums"
              }
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {tShelf("perMillion")} · {t("volume")}
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="pd-intro">
            <h2 id="pd-intro" className={sectionTitle}>
              {t("toc.intro")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {capabilities.map((c) => (
                <div key={c.title}>
                  <dt className="text-sm font-medium">{c.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="pd-quickstart">
            <h2 id="pd-quickstart" className={sectionTitle}>
              {t("toc.quickstart")}
            </h2>
            <div className="mt-3">
              <CodeSample title="cURL" code={sampleFor(model, baseUrl)} />
            </div>
          </section>

          <section aria-labelledby="pd-apis">
            <h2 id="pd-apis" className={sectionTitle}>
              {t("toc.apis")}
            </h2>
            <div className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">
                      {t("col.api")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">
                      {t("col.method")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">
                      {t("col.path")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a.key} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">{t(`api.${a.key}`)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.method}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{a.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="pd-pricing">
            <h2 id="pd-pricing" className={sectionTitle}>
              {t("toc.pricing")}
            </h2>
            <div className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">
                      {t("col.unit")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      {t("col.price")}
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-sans">{t("input")}</td>
                    <td className="px-4 py-3 text-right">{input} / 1M</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-sans">{t("output")}</td>
                    <td className="px-4 py-3 text-right">{output} / 1M</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("listPrice")}</p>
          </section>

          <section aria-labelledby="pd-related">
            <h2 id="pd-related" className={sectionTitle}>
              {t("toc.related")}
            </h2>
            {related.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("noRelated")}</p>
            ) : (
              <ModelTable className="mt-3" models={related} caption={t("toc.related")} />
            )}
          </section>
        </div>

        <nav aria-label={t("onThisPage")} className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-medium text-muted-foreground">{t("onThisPage")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <a
                    href={`#pd-${id}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t(`toc.${id}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
