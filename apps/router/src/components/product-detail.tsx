"use client";

import { brand } from "@nebutra/brand/metadata";
import { BookOpen, Copy } from "@nebutra/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandMark, BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import { ProductCard } from "@/components/product-card";
import { useCategoryLabel } from "@/hooks/use-category-label";
import {
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

const TOC = [
  { id: "intro" },
  { id: "playground" },
  { id: "apis" },
  { id: "pricing" },
  { id: "related" },
] as const;

/**
 * 302 /product/detail/{slug} 对齐：
 * 面包屑 · 左封面 · 中信息价 · 右指标 · 左 TOC · 右内容区
 */
export function ProductDetail({
  model,
  related,
}: {
  model: ListingModel;
  related: readonly ListingModel[];
}) {
  const t = useTranslations("detail");
  const categoryLabelOf = useCategoryLabel();
  const [tab, setTab] = useState<(typeof TOC)[number]["id"]>("intro");
  const [copied, setCopied] = useState(false);
  const provider = resolveListingProvider(model);
  const cover = PROVIDER_COVER[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const categoryLabel = categoryLabelOf(model.category);

  const blurb = useMemo(() => {
    if (model.description && model.description !== model.publicModel) return model.description;
    return t("blurb", {
      provider: providerLabel,
      category: categoryLabel,
      context: model.context || "—",
    });
  }, [model, providerLabel, categoryLabel, t]);

  const intro = useMemo(() => {
    return [
      t("intro.what", {
        model: model.publicModel,
        provider: providerLabel,
        category: categoryLabel,
      }),
      t("intro.how", { brandName: brand.name }),
      model.sellable || model.routed ? t("intro.live") : t("intro.catalog"),
    ].join(" ");
  }, [model, providerLabel, categoryLabel, t]);

  const capabilities = useMemo(() => {
    const price = {
      input: formatPrice(model.inputPerMTok),
      output: formatPrice(model.outputPerMTok),
    };
    const items: Array<{ title: string; body: string }> = [
      { title: t("cap.unifiedTitle"), body: t("cap.unifiedBody") },
      { title: t("cap.meteredTitle"), body: t("cap.meteredBody", price) },
      {
        title: t("cap.contextTitle"),
        body: t("cap.contextBody", { context: model.context || "—" }),
      },
    ];
    if (model.category === "reasoning") {
      items.push({ title: t("cap.reasoningTitle"), body: t("cap.reasoningBody") });
    }
    if (model.category === "multimodal" || model.category === "image") {
      items.push({ title: t("cap.multimodalTitle"), body: t("cap.multimodalBody") });
    }
    return items;
  }, [model, t]);

  /**
   * The endpoints this model actually answers on.
   *
   * This was a hardcoded `/v1/chat/completions` for every model, which is wrong
   * for an image SKU: gpt-image-2.5 answers only on /v1/images/*, and a chat
   * call to it is refused. The page was telling a customer to make a request
   * that cannot work, which is the worst thing a detail page can do — their
   * first call fails and the fault looks like ours.
   */
  const apis = useMemo(() => {
    if (model.category === "image") {
      return [
        { key: "imagesGenerate", path: "/v1/images/generations", method: "POST" },
        { key: "imagesEdit", path: "/v1/images/edits", method: "POST" },
      ];
    }
    if (model.category === "audio") {
      return [
        { key: "audioSpeech", path: "/v1/audio/speech", method: "POST" },
        { key: "audioTranscribe", path: "/v1/audio/transcriptions", method: "POST" },
      ];
    }
    if (model.category === "data") {
      return [{ key: "embeddings", path: "/v1/embeddings", method: "POST" }];
    }
    return [
      { key: "chat", path: "/v1/chat/completions", method: "POST" },
      // Streaming is the same endpoint with `stream: true`, listed separately
      // because a buyer scanning the table is looking for the word.
      { key: "chatStream", path: "/v1/chat/completions", method: "POST" },
      { key: "responses", path: "/v1/responses", method: "POST" },
    ];
  }, [model.category]);

  async function copyForAi() {
    const text = [
      // Pasted into an AI assistant: kept in English, the lingua franca of model docs.
      `Model: ${model.publicModel}`,
      `Provider: ${providerLabel}`,
      `Category: ${model.category}`,
      `Input: ${formatPrice(model.inputPerMTok)}/1M`,
      `Output: ${formatPrice(model.outputPerMTok)}/1M`,
      `Context: ${model.context || "—"}`,
      `Endpoint: ${brand.name} Router OpenAI-compatible ${apis[0]?.path ?? "/v1/chat/completions"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function scrollTo(id: (typeof TOC)[number]["id"]) {
    setTab(id);
    const el = document.getElementById(`pd-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="router-market-shell py-5 md:py-7">
      {/* 面包屑 */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/?product_type=api" className="hover:text-neutral-12">
          API
        </Link>
        <span className="text-neutral-7">/</span>
        <Link
          href={`/models?cate=api&tag=${encodeURIComponent(model.category)}`}
          className="hover:text-neutral-12"
        >
          {categoryLabel}
        </Link>
        <span className="text-neutral-7">/</span>
        <Link
          href={`/models?cate=api&brand=${encodeURIComponent(provider)}`}
          className="hover:text-neutral-12"
        >
          {providerLabel}
        </Link>
        <span className="text-neutral-7">/</span>
        <span className="font-medium text-neutral-12">{model.publicModel}</span>
      </nav>

      {/* 顶区：封面 + 信息 + 指标 */}
      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1.1fr)_minmax(240px,280px)] xl:grid-cols-[260px_minmax(0,1.15fr)_minmax(260px,300px)] xl:gap-6">
        <div
          // allow-palette: depth ring on provider cover wash artwork, not app chrome
          className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-[20px] p-6 shadow-[0_8px_28px_rgb(15_23_42/0.06)] ring-1 ring-black/[0.04]"
          style={{ background: cover.wash }}
        >
          <span
            className={[
              "inline-flex max-w-full items-center rounded-2xl px-4 py-3 shadow-md ring-1",
              // allow-palette: chip surface pinned to provider cover art (light/dark chosen by cover.dark, not app theme)
              cover.dark ? "bg-white ring-white/10" : "bg-white/96 ring-black/[0.04]",
            ].join(" ")}
          >
            <BrandPill provider={provider} size={24} tone="light" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-neutral-12 md:text-2xl">
              {model.publicModel}
            </h1>
            <button
              type="button"
              onClick={() => void copyForAi()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1 px-3.5 text-xs font-medium text-neutral-11 transition hover:border-neutral-7 hover:text-neutral-12"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? t("copied") : t("copyForAi")}
            </button>
          </div>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-11">{blurb}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-3 px-2.5 py-1 text-xs font-medium text-neutral-11">
              <BrandMark provider={provider} size={14} surface="light" />
              {categoryLabel}
            </span>
            {model.sellable || model.routed ? (
              <span className="rounded-full bg-success/16 px-2.5 py-1 text-xs font-medium text-success-strong">
                {t("sellable")}
              </span>
            ) : (
              <span className="rounded-full bg-neutral-3 px-2.5 py-1 text-xs text-muted-foreground">
                {t("catalogOnly")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {t("contextChip", { context: model.context || "—" })}
            </span>
          </div>

          <dl className="mt-5 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-4/80 py-1.5">
              <dt className="text-muted-foreground">{t("input")}</dt>
              <dd className="font-mono font-medium text-blue-11">
                {formatPrice(model.inputPerMTok)}/1M tokens
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-neutral-4/80 py-1.5">
              <dt className="text-muted-foreground">{t("output")}</dt>
              <dd className="font-mono font-medium text-blue-11">
                {formatPrice(model.outputPerMTok)}/1M tokens
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-muted-foreground">{t("provider")}</dt>
              <dd className="font-medium text-neutral-12">{providerLabel}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-11">{t("volume")}</p>
        </div>

        <aside className="router-market-panel flex h-fit flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1 px-4 text-sm font-medium text-neutral-12 transition hover:bg-neutral-2"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              {t("docs")}
            </Link>
            <Link
              href={`/use?model=${encodeURIComponent(model.publicModel)}`}
              className="inline-flex h-10 items-center rounded-full bg-neutral-12 px-5 text-sm font-medium text-neutral-1 transition-colors hover:bg-neutral-12/90"
            >
              Playground
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-neutral-5 pt-4 text-sm">
            <div>
              <dt className="text-xs text-neutral-11">{t("input")}</dt>
              <dd className="mt-0.5 font-mono font-medium text-neutral-12">
                {formatPrice(model.inputPerMTok)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-11">{t("output")}</dt>
              <dd className="mt-0.5 font-mono font-medium text-neutral-12">
                {formatPrice(model.outputPerMTok)}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      {/* 下区：TOC + 内容 */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)] xl:gap-6">
        <nav className="router-market-panel sticky top-4 h-fit space-y-0.5 p-2">
          {TOC.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={[
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                tab === item.id
                  ? "bg-neutral-3 font-semibold text-neutral-12"
                  : "text-neutral-11 hover:bg-neutral-2",
              ].join(" ")}
            >
              <span
                className={[
                  "h-4 w-0.5 rounded-full",
                  tab === item.id ? "bg-primary" : "bg-transparent",
                ].join(" ")}
                aria-hidden
              />
              {t(`toc.${item.id}`)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          <article id="pd-intro" className="router-market-panel scroll-mt-6 p-5 md:p-6">
            <h2 className="text-base font-semibold text-neutral-12">{t("toc.intro")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-11">{intro}</p>
            <hr className="my-5 border-neutral-5" />
            <h3 className="text-sm font-semibold text-neutral-12">{t("capabilities")}</h3>
            <ul className="mt-3 space-y-3">
              {capabilities.map((c) => (
                <li key={c.title} className="text-sm leading-relaxed text-neutral-11">
                  <span className="font-semibold text-neutral-12">{c.title}</span>
                  {" — "}
                  {c.body}
                </li>
              ))}
            </ul>
          </article>

          {/* 302 式 Playground 空态：大白卡 + 插画 + 登录/试用（无 mock 指标） */}
          <article
            id="pd-playground"
            className="router-market-panel scroll-mt-6 overflow-hidden p-0"
          >
            <div className="border-b border-neutral-5 px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-neutral-12">Playground</h2>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center md:py-16">
              <PlaygroundEmptyArt />
              <p className="mt-6 text-sm text-muted-foreground">
                {t("signInMore")} <AuthActions variant="compact" className="inline" />
              </p>
              <Link
                href={`/use?model=${encodeURIComponent(model.publicModel)}`}
                className="mt-4 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90"
              >
                {t("openPlayground", { model: model.publicModel })}
              </Link>
            </div>
          </article>

          <article
            id="pd-apis"
            className="router-market-panel scroll-mt-6 overflow-hidden p-0 md:p-0"
          >
            <div className="border-b border-neutral-5 px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-neutral-12">
                {t("toc.apis")}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({apis.length})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table bare className="w-full min-w-[640px] text-sm">
                <TableHeader>
                  <TableRow className="bg-neutral-2/80 text-xs text-muted-foreground">
                    <TableHead alignment="start" className="px-5 font-medium md:px-6">
                      {t("col.api")}
                    </TableHead>
                    <TableHead alignment="start" className="px-3 font-medium">
                      {t("col.path")}
                    </TableHead>
                    <TableHead alignment="start" className="px-3 font-medium">
                      {t("col.method")}
                    </TableHead>
                    <TableHead alignment="start" className="px-5 font-medium md:px-6">
                      {t("col.params")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody bordered>
                  {apis.map((a) => (
                    <TableRow key={a.key}>
                      <TableCell
                        alignment="start"
                        className="px-5 py-3.5 font-medium text-neutral-12 md:px-6"
                      >
                        {t(`api.${a.key}`)}
                      </TableCell>
                      <TableCell
                        alignment="start"
                        className="max-w-[280px] truncate px-3 py-3.5 font-mono text-xs text-neutral-11"
                      >
                        {a.path}
                      </TableCell>
                      <TableCell alignment="start" className="px-3 py-3.5">
                        <span className="rounded-md bg-neutral-3 px-1.5 py-0.5 text-xs font-semibold">
                          {a.method}
                        </span>
                      </TableCell>
                      <TableCell alignment="start" className="px-5 py-3.5 md:px-6">
                        <Link href="/docs" className="text-blue-11 hover:underline">
                          {t("viewDetails")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </article>

          <article id="pd-pricing" className="router-market-panel scroll-mt-6 overflow-hidden p-0">
            <div className="border-b border-neutral-5 px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-neutral-12">{t("toc.pricing")}</h2>
            </div>
            <div className="overflow-x-auto">
              <Table bare className="w-full min-w-[560px] text-sm">
                <TableHeader>
                  <TableRow className="bg-neutral-2/80 text-xs text-muted-foreground">
                    <TableHead alignment="start" className="px-5 font-medium md:px-6">
                      {t("col.model")}
                    </TableHead>
                    <TableHead alignment="start" className="px-3 font-medium">
                      {t("col.context")}
                    </TableHead>
                    <TableHead alignment="start" className="px-3 font-medium">
                      {t("input")}
                    </TableHead>
                    <TableHead alignment="start" className="px-3 font-medium">
                      {t("output")}
                    </TableHead>
                    <TableHead alignment="start" className="px-5 font-medium md:px-6">
                      {t("col.note")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      alignment="start"
                      className="px-5 py-3.5 font-mono font-medium text-neutral-12 md:px-6"
                    >
                      {model.publicModel}
                    </TableCell>
                    <TableCell alignment="start" className="px-3 py-3.5 tabular-nums">
                      {model.context || "—"}
                    </TableCell>
                    <TableCell alignment="start" className="px-3 py-3.5 font-mono text-blue-11">
                      {formatPrice(model.inputPerMTok)}/1M
                    </TableCell>
                    <TableCell alignment="start" className="px-3 py-3.5 font-mono text-blue-11">
                      {formatPrice(model.outputPerMTok)}/1M
                    </TableCell>
                    <TableCell
                      alignment="start"
                      className="px-5 py-3.5 text-muted-foreground md:px-6"
                    >
                      {t("listPrice")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </article>

          <section id="pd-related" className="scroll-mt-6">
            <h2 className="mb-4 text-base font-semibold text-neutral-12">{t("toc.related")}</h2>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRelated")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {related.map((m) => (
                  <ProductCard key={m.publicModel} m={m} layout="tile" />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

/** 302 Playground 空态插画（SVG，无外链、无假数据） */
function PlaygroundEmptyArt() {
  return (
    <svg
      width="280"
      height="200"
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="max-w-full"
    >
      <ellipse cx="140" cy="168" rx="88" ry="14" fill="var(--blue-3)" opacity="0.45" />
      <path
        d="M48 150c18-28 42-40 72-36 22 3 38 14 52 28"
        stroke="var(--blue-4)"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M200 148c16-18 36-26 56-20"
        stroke="var(--blue-4)"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* phone */}
      <rect x="148" y="36" width="88" height="128" rx="16" fill="var(--blue-3)" />
      <rect x="156" y="48" width="72" height="104" rx="8" fill="white" />
      <rect x="168" y="60" width="48" height="36" rx="8" fill="var(--blue-4)" opacity="0.55" />
      <rect x="168" y="106" width="48" height="28" rx="8" fill="var(--blue-4)" opacity="0.35" />
      {/* locks */}
      <circle cx="192" cy="78" r="10" fill="white" />
      <rect x="186" y="76" width="12" height="10" rx="2" fill="hsl(var(--primary))" opacity="0.7" />
      <path
        d="M188 76v-4a4 4 0 018 0v4"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <circle cx="192" cy="120" r="8" fill="white" />
      <rect
        x="187"
        y="118"
        width="10"
        height="8"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.55"
      />
      {/* person */}
      <circle cx="108" cy="72" r="16" fill="hsl(var(--primary))" opacity="0.85" />
      <path
        d="M84 148c4-28 12-44 24-48 14-5 28 4 36 22 6 14 8 28 8 40"
        fill="hsl(var(--primary))"
        opacity="0.8"
      />
      <path
        d="M92 100c-8 6-14 16-16 28"
        stroke="hsl(var(--primary))"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M128 104c10 4 16 14 18 26"
        stroke="hsl(var(--primary))"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
