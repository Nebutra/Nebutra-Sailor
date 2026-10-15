import { brand } from "@nebutra/brand/metadata";
import { Button, CopyButton } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
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
    "  -d '{",
    `    "model": "${model.publicModel}",`,
    `    "messages": [{ "role": "user", "content": "Hello" }]`,
    "  }'",
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
  // Unknown values are omitted everywhere on this page, never printed as "—".
  const hasInput = model.inputPerMTok > 0;
  const hasOutput = model.outputPerMTok > 0;
  const priced = hasInput || hasOutput;
  const input = formatPrice(model.inputPerMTok);
  const output = formatPrice(model.outputPerMTok);

  // The catalogue's display name when it adds something to the id; otherwise the id.
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const named = model.name && norm(model.name) !== norm(model.publicModel) ? model.name : null;
  const title = named ?? model.publicModel;

  const blurb =
    model.description &&
    norm(model.description) !== norm(model.publicModel) &&
    norm(model.description) !== norm(model.name)
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
  ];
  if (hasInput && hasOutput) {
    capabilities.push({
      title: t("cap.meteredTitle"),
      body: t("cap.meteredBody", { input, output }),
    });
  }
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
    ...(hasInput ? [`Input: ${input}/1M tokens`] : []),
    ...(hasOutput ? [`Output: ${output}/1M tokens`] : []),
    ...(model.context ? [`Context: ${model.context} tokens`] : []),
    `Endpoint: ${brand.name} Router OpenAI-compatible ${apis[0]?.path ?? "/v1/chat/completions"}`,
  ].join("\n");

  const stats: Array<{ label: string; value: string; unit?: string; text?: boolean }> = [
    ...(hasInput ? [{ label: tShelf("col.input"), value: input, unit: tShelf("perM") }] : []),
    ...(hasOutput ? [{ label: tShelf("col.output"), value: output, unit: tShelf("perM") }] : []),
    ...(model.context
      ? [{ label: tShelf("col.context"), value: model.context, unit: tShelf("tokens") }]
      : []),
    { label: t("status"), value: live ? t("sellable") : t("catalogOnly"), text: true },
  ];

  const sections = SECTIONS.filter((id) => id !== "pricing" || priced).filter(
    (id) => id !== "related" || related.length > 0,
  );
  const sectionTitle = "scroll-mt-24 text-xl";
  const tableHead = "h-10 px-4 text-xs font-medium text-muted-foreground";

  return (
    <div className="router-glow">
      <div className="router-market-shell pt-8 pb-24">
        <nav aria-label={t("breadcrumb")} className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/models" className="transition-colors hover:text-foreground">
                {tShelf("nav.models")}
              </Link>
            </li>
            <li aria-hidden className="text-border">
              /
            </li>
            <li>
              <Link
                href={`/models?brand=${encodeURIComponent(provider)}`}
                className="transition-colors hover:text-foreground"
              >
                {providerLabel}
              </Link>
            </li>
            <li aria-hidden className="text-border">
              /
            </li>
            <li aria-current="page" className="min-w-0 break-all text-foreground">
              {model.publicModel}
            </li>
          </ol>
        </nav>

        <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-md">
                <BrandMark provider={provider} size={28} />
              </span>
              <div className="min-w-0">
                <h1 className="text-3xl text-balance md:text-4xl">
                  {providerLabel}: {title}
                </h1>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <code className="font-mono break-all">{model.publicModel}</code>
                  <CopyButton value={model.publicModel} aria-label={t("copyId")} size="icon" />
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-[65ch] text-sm text-pretty text-muted-foreground">{blurb}</p>
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

        <dl
          className={cn(
            "mt-10 grid grid-cols-2 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm",
            stats.length >= 4 ? "md:grid-cols-4" : stats.length === 3 ? "md:grid-cols-3" : "",
          )}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "px-5 py-5",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "border-t border-border md:border-t-0",
                i >= 1 && "md:border-l",
              )}
            >
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-2 flex items-baseline gap-1.5">
                <span className={s.text ? "text-xl" : "text-3xl tabular-nums"}>{s.value}</span>
                {s.unit ? <span className="text-xs text-muted-foreground">{s.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_11rem] lg:gap-16">
          <div className="min-w-0 space-y-14">
            <section aria-labelledby="pd-intro">
              <h2 id="pd-intro" className={sectionTitle}>
                {t("toc.intro")}
              </h2>
              <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                {intro}
              </p>
              <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                {capabilities.map((c) => (
                  <div key={c.title} className="border-t border-border pt-4">
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
              <div className="mt-4">
                <CodeSample title="cURL" code={sampleFor(model, baseUrl)} />
              </div>
            </section>

            <section aria-labelledby="pd-apis">
              <h2 id="pd-apis" className={sectionTitle}>
                {t("toc.apis")}
              </h2>
              <div className="mt-4 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className={cn(tableHead, "text-left")}>
                        {t("col.api")}
                      </th>
                      <th scope="col" className={cn(tableHead, "w-24 text-left")}>
                        {t("col.method")}
                      </th>
                      <th scope="col" className={cn(tableHead, "text-left")}>
                        {t("col.path")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {apis.map((a) => (
                      <tr key={a.key} className="border-b border-border last:border-b-0">
                        <td className="h-11 px-4">{t(`api.${a.key}`)}</td>
                        <td className="h-11 px-4">
                          <span className="rounded-[var(--radius-sm)] bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {a.method}
                          </span>
                        </td>
                        <td className="h-11 px-4 font-mono text-sm">{a.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {priced ? (
              <section aria-labelledby="pd-pricing">
                <h2 id="pd-pricing" className={sectionTitle}>
                  {t("toc.pricing")}
                </h2>
                <div className="mt-4 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm">
                  <table className="w-full min-w-[20rem] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className={cn(tableHead, "text-left")}>
                          {t("col.unit")}
                        </th>
                        <th scope="col" className={cn(tableHead, "text-right")}>
                          {t("col.price")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasInput ? (
                        <tr className="border-b border-border last:border-b-0">
                          <td className="h-11 px-4">{t("inputTokens")}</td>
                          <td className="h-11 px-4 text-right font-mono tabular-nums">
                            {t("perMillion", { price: input })}
                          </td>
                        </tr>
                      ) : null}
                      {hasOutput ? (
                        <tr>
                          <td className="h-11 px-4">{t("outputTokens")}</td>
                          <td className="h-11 px-4 text-right font-mono tabular-nums">
                            {t("perMillion", { price: output })}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("listPrice")} {t("volume")}
                </p>
              </section>
            ) : null}

            {related.length > 0 ? (
              <section aria-labelledby="pd-related">
                <h2 id="pd-related" className={sectionTitle}>
                  {t("toc.related")}
                </h2>
                <ModelTable className="mt-4" models={related} caption={t("toc.related")} />
              </section>
            ) : null}
          </div>

          <nav aria-label={t("onThisPage")} className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-medium text-muted-foreground">{t("onThisPage")}</p>
              <ul className="mt-3 space-y-1 border-l border-border">
                {sections.map((id) => (
                  <li key={id}>
                    <a
                      href={`#pd-${id}`}
                      className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
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
    </div>
  );
}
