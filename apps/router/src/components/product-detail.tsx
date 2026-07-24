"use client";

import { BookOpen, Copy } from "@nebutra/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark, BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import { ProductCard } from "@/components/product-card";
import {
  CATEGORY_LABEL,
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

/** 仅保留当前有真实内容的区块；探针/统计未接入则不进 TOC */
const TOC_BASE = [
  { id: "intro", label: "API介绍" },
  { id: "playground", label: "Playground" },
  { id: "apis", label: "API列表" },
  { id: "pricing", label: "API价格表" },
  { id: "related", label: "猜你喜欢" },
] as const;

type TocId = (typeof TOC_BASE)[number]["id"];

/**
 * 302 /product/detail/{slug}
 * 生产原则：有字段才展示，无 mock 成功率/延迟/TPS。
 */
export function ProductDetail({
  model,
  related,
}: {
  model: ListingModel;
  related: readonly ListingModel[];
}) {
  const [tab, setTab] = useState<TocId>("intro");
  const [copied, setCopied] = useState(false);
  const provider = resolveListingProvider(model);
  const cover = PROVIDER_COVER[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const categoryLabel = CATEGORY_LABEL[model.category];

  const hasInputPrice = model.inputPerMTok > 0;
  const hasOutputPrice = model.outputPerMTok > 0;
  const hasContext = Boolean(model.context && model.context !== "—");
  const isSellable = model.sellable || model.routed;
  const routeCount = model.routes?.length ?? 0;

  const blurb = useMemo(() => {
    if (
      model.description &&
      model.description !== model.publicModel &&
      model.description !== model.name
    ) {
      return model.description;
    }
    if (model.name && model.name !== model.publicModel) return model.name;
    return null;
  }, [model]);

  const toc = useMemo(() => {
    return TOC_BASE.filter((t) => {
      if (t.id === "related") return related.length > 0;
      return true;
    });
  }, [related.length]);

  /** 真实 Chat 接入面（本产品网关路径，非虚构） */
  const apis = useMemo(
    () => [
      {
        name: "Chat completions",
        path: "/api/v1/chat/completions",
        method: "POST",
      },
    ],
    [],
  );

  async function copyForAi() {
    const lines = [
      `模型: ${model.publicModel}`,
      `厂商: ${providerLabel}`,
      `分类: ${categoryLabel}`,
    ];
    if (hasInputPrice) lines.push(`输入: ${formatPrice(model.inputPerMTok)}/1M`);
    if (hasOutputPrice) lines.push(`输出: ${formatPrice(model.outputPerMTok)}/1M`);
    if (hasContext) lines.push(`上下文: ${model.context}`);
    lines.push(`状态: ${isSellable ? "可售" : "目录"}`);
    lines.push(`接入: POST /api/v1/chat/completions · model=${model.publicModel}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be denied */
    }
  }

  function scrollTo(id: TocId) {
    setTab(id);
    document.getElementById(`pd-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="router-market-shell py-5 md:py-7">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--neutral-10)]">
        <Link href="/?product_type=api" className="hover:text-[var(--neutral-12)]">
          API
        </Link>
        <span className="text-[var(--neutral-7)]">/</span>
        <Link
          href={`/models?cate=api&tag=${encodeURIComponent(model.category)}`}
          className="hover:text-[var(--neutral-12)]"
        >
          {categoryLabel}
        </Link>
        <span className="text-[var(--neutral-7)]">/</span>
        <Link
          href={`/models?cate=api&brand=${encodeURIComponent(provider)}`}
          className="hover:text-[var(--neutral-12)]"
        >
          {providerLabel}
        </Link>
        <span className="text-[var(--neutral-7)]">/</span>
        <span className="font-medium text-[var(--neutral-12)]">{model.publicModel}</span>
      </nav>

      {/* 顶区：封面 + 信息 + 货架事实（无 mock 指标） */}
      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_minmax(220px,260px)] xl:grid-cols-[260px_minmax(0,1fr)_minmax(240px,280px)] xl:gap-6">
        <div
          className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-[20px] p-6 shadow-[0_8px_28px_rgb(15_23_42/0.06)] ring-1 ring-black/[0.04]"
          style={{ background: cover.wash }}
        >
          <span
            className={[
              "inline-flex max-w-full items-center rounded-2xl px-4 py-3 shadow-md ring-1",
              cover.dark ? "bg-white ring-white/10" : "bg-white/96 ring-black/[0.04]",
            ].join(" ")}
          >
            <BrandPill provider={provider} size={24} tone="light" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-mono text-[22px] font-semibold tracking-tight text-[var(--neutral-12)] md:text-[26px]">
              {model.publicModel}
            </h1>
            <button
              type="button"
              onClick={() => void copyForAi()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--neutral-6)] bg-white px-3.5 text-[12px] font-medium text-[var(--neutral-11)] transition hover:border-[var(--neutral-7)] hover:text-[var(--neutral-12)]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? "已复制" : "复制给 AI"}
            </button>
          </div>

          {blurb ? (
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--neutral-11)]">
              {blurb}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--neutral-3)] px-2.5 py-1 text-[11px] font-medium text-[var(--neutral-11)]">
              <BrandMark provider={provider} size={14} surface="light" />
              {categoryLabel}
            </span>
            {isSellable ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--status-success)_16%,white)] px-2.5 py-1 text-[11px] font-medium text-[var(--status-success)]">
                可售
              </span>
            ) : (
              <span className="rounded-full bg-[var(--neutral-3)] px-2.5 py-1 text-[11px] text-[var(--neutral-10)]">
                目录
              </span>
            )}
            {hasContext ? (
              <span className="text-[12px] text-[var(--neutral-9)]">上下文 {model.context}</span>
            ) : null}
          </div>

          {(hasInputPrice || hasOutputPrice) && (
            <dl className="mt-5 space-y-0 text-[13px]">
              {hasInputPrice ? (
                <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-4)]/80 py-2">
                  <dt className="text-[var(--neutral-10)]">输入</dt>
                  <dd className="font-mono font-medium text-[var(--blue-11)]">
                    {formatPrice(model.inputPerMTok)}/1M tokens
                  </dd>
                </div>
              ) : null}
              {hasOutputPrice ? (
                <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-4)]/80 py-2">
                  <dt className="text-[var(--neutral-10)]">输出</dt>
                  <dd className="font-mono font-medium text-[var(--blue-11)]">
                    {formatPrice(model.outputPerMTok)}/1M tokens
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-[var(--neutral-10)]">厂商</dt>
                <dd className="font-medium text-[var(--neutral-12)]">{providerLabel}</dd>
              </div>
            </dl>
          )}

          {!hasInputPrice && !hasOutputPrice ? (
            <div className="mt-5 flex items-center justify-between gap-4 border-y border-[var(--neutral-4)]/80 py-2 text-[13px]">
              <span className="text-[var(--neutral-10)]">厂商</span>
              <span className="font-medium text-[var(--neutral-12)]">{providerLabel}</span>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--neutral-6)] bg-white px-4 text-[13px] font-medium text-[var(--neutral-12)] transition hover:bg-[var(--neutral-2)]"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              查看文档
            </Link>
            <Link
              href={`/use?model=${encodeURIComponent(model.publicModel)}`}
              className="inline-flex h-10 items-center rounded-full bg-[var(--neutral-12)] px-5 text-[13px] font-medium text-[var(--neutral-1)] transition hover:bg-[var(--neutral-11)]"
            >
              Playground
            </Link>
          </div>
        </div>

        {/* 右侧：仅货架事实卡片 */}
        <aside className="router-market-panel flex h-fit flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-[var(--neutral-5)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--neutral-12)]">货架信息</p>
          </div>
          <dl className="divide-y divide-[var(--neutral-5)] text-[13px]">
            <FactRow label="状态" value={isSellable ? "可售" : "目录"} emphasize={isSellable} />
            <FactRow label="厂商" value={providerLabel} />
            <FactRow label="分类" value={categoryLabel} />
            {hasContext ? <FactRow label="上下文" value={model.context} mono /> : null}
            {hasInputPrice ? (
              <FactRow label="输入" value={`${formatPrice(model.inputPerMTok)}/1M`} mono />
            ) : null}
            {hasOutputPrice ? (
              <FactRow label="输出" value={`${formatPrice(model.outputPerMTok)}/1M`} mono />
            ) : null}
            {routeCount > 0 ? <FactRow label="已配置路由" value={`${routeCount} 条`} mono /> : null}
            <FactRow
              label="数据来源"
              value={model.source === "models.dev" ? "models.dev" : "alias"}
            />
          </dl>
        </aside>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)] xl:gap-6">
        <nav className="router-market-panel sticky top-4 h-fit space-y-0.5 p-2">
          {toc.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => scrollTo(t.id)}
              className={[
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                tab === t.id
                  ? "bg-[var(--neutral-3)] font-semibold text-[var(--neutral-12)]"
                  : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-4 w-0.5 rounded-full",
                  tab === t.id ? "bg-[var(--blue-9)]" : "bg-transparent",
                ].join(" ")}
                aria-hidden
              />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          <article id="pd-intro" className="router-market-panel scroll-mt-6 p-5 md:p-6">
            <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">API介绍</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--neutral-11)]">
              <span className="font-mono font-medium text-[var(--neutral-12)]">
                {model.publicModel}
              </span>
              {" · "}
              {providerLabel}
              {" · "}
              {categoryLabel}
              {hasContext ? ` · 上下文 ${model.context}` : ""}
              {isSellable ? " · 当前可售" : " · 目录参考"}
              。通过 Nebutra Router 的 OpenAI 兼容接口调用，指定{" "}
              <code className="rounded bg-[var(--neutral-3)] px-1 py-0.5 font-mono text-[12px]">
                model={model.publicModel}
              </code>
              。
            </p>
            {(hasInputPrice || hasOutputPrice || hasContext || routeCount > 0) && (
              <>
                <hr className="my-5 border-[var(--neutral-5)]" />
                <h3 className="text-[14px] font-semibold text-[var(--neutral-12)]">已知参数</h3>
                <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[var(--neutral-11)]">
                  {hasInputPrice ? (
                    <li>输入单价 {formatPrice(model.inputPerMTok)} / 1M tokens（目录价）</li>
                  ) : null}
                  {hasOutputPrice ? (
                    <li>输出单价 {formatPrice(model.outputPerMTok)} / 1M tokens（目录价）</li>
                  ) : null}
                  {hasContext ? <li>上下文窗口 {model.context}</li> : null}
                  {routeCount > 0 ? <li>已配置上游路由 {routeCount} 条</li> : null}
                </ul>
              </>
            )}
          </article>

          <article id="pd-playground" className="router-market-panel scroll-mt-6 p-5 md:p-6">
            <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">Playground</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--neutral-10)]">
              使用快捷使用页对本模型发起对话（需可用 Key / 余额）。
            </p>
            <Link
              href={`/use?model=${encodeURIComponent(model.publicModel)}`}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--neutral-12)] px-5 text-[13px] font-medium text-white transition hover:bg-[var(--neutral-11)]"
            >
              打开 Playground
            </Link>
          </article>

          <article id="pd-apis" className="router-market-panel scroll-mt-6 overflow-hidden p-0">
            <div className="border-b border-[var(--neutral-5)] px-5 py-4 md:px-6">
              <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">
                API列表
                <span className="ml-2 text-[13px] font-normal text-[var(--neutral-9)]">
                  ({apis.length})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-[var(--neutral-2)]/80 text-[12px] text-[var(--neutral-10)]">
                  <tr>
                    <th className="px-5 py-3 font-medium md:px-6">描述</th>
                    <th className="px-3 py-3 font-medium">路径</th>
                    <th className="px-3 py-3 font-medium">方法</th>
                    <th className="px-5 py-3 font-medium md:px-6">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a.name} className="border-t border-[var(--neutral-5)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--neutral-12)] md:px-6">
                        {a.name}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[12px] text-[var(--neutral-11)]">
                        {a.path}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-md bg-[var(--neutral-3)] px-1.5 py-0.5 text-[11px] font-semibold">
                          {a.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--neutral-10)] md:px-6">
                        body.model = {model.publicModel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="pd-pricing" className="router-market-panel scroll-mt-6 overflow-hidden p-0">
            <div className="border-b border-[var(--neutral-5)] px-5 py-4 md:px-6">
              <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">API价格表</h2>
            </div>
            {hasInputPrice || hasOutputPrice || hasContext ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead className="bg-[var(--neutral-2)]/80 text-[12px] text-[var(--neutral-10)]">
                    <tr>
                      <th className="px-5 py-3 font-medium md:px-6">模型</th>
                      {hasContext ? <th className="px-3 py-3 font-medium">上下文</th> : null}
                      {hasInputPrice ? <th className="px-3 py-3 font-medium">输入</th> : null}
                      {hasOutputPrice ? <th className="px-3 py-3 font-medium">输出</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[var(--neutral-5)]">
                      <td className="px-5 py-3.5 font-mono font-medium text-[var(--neutral-12)] md:px-6">
                        {model.publicModel}
                      </td>
                      {hasContext ? (
                        <td className="px-3 py-3.5 tabular-nums">{model.context}</td>
                      ) : null}
                      {hasInputPrice ? (
                        <td className="px-3 py-3.5 font-mono text-[var(--blue-11)]">
                          {formatPrice(model.inputPerMTok)}/1M
                        </td>
                      ) : null}
                      {hasOutputPrice ? (
                        <td className="px-3 py-3.5 font-mono text-[var(--blue-11)]">
                          {formatPrice(model.outputPerMTok)}/1M
                        </td>
                      ) : null}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--neutral-10)] md:px-6">
                暂无目录价。连通 models.dev / 供给后显示。
              </p>
            )}
          </article>

          {related.length > 0 ? (
            <section id="pd-related" className="scroll-mt-6">
              <h2 className="mb-4 text-[16px] font-semibold text-[var(--neutral-12)]">猜你喜欢</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {related.map((m) => (
                  <ProductCard key={m.publicModel} m={m} layout="tile" />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FactRow({
  label,
  value,
  mono,
  emphasize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-[12px] text-[var(--neutral-10)]">{label}</dt>
      <dd
        className={[
          "min-w-0 truncate text-right text-[13px] font-medium",
          mono ? "font-mono tabular-nums" : "",
          emphasize ? "text-[var(--status-success)]" : "text-[var(--neutral-12)]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
