"use client";

import { BookOpen, Copy } from "@nebutra/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandMark, BrandPill, PROVIDER_COVER } from "@/components/brand-marks";
import { ProductCard } from "@/components/product-card";
import {
  CATEGORY_LABEL,
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

const TOC = [
  { id: "intro", label: "API介绍" },
  { id: "playground", label: "Playground" },
  { id: "apis", label: "API列表" },
  { id: "pricing", label: "API价格表" },
  { id: "related", label: "猜你喜欢" },
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
  const [tab, setTab] = useState<(typeof TOC)[number]["id"]>("intro");
  const [copied, setCopied] = useState(false);
  const provider = resolveListingProvider(model);
  const cover = PROVIDER_COVER[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const categoryLabel = CATEGORY_LABEL[model.category];

  const blurb = useMemo(() => {
    if (model.description && model.description !== model.publicModel) return model.description;
    return `${providerLabel} 出品 · ${categoryLabel} · 上下文 ${model.context || "—"} · 可经 Router 统一接入。`;
  }, [model, providerLabel, categoryLabel]);

  const intro = useMemo(() => {
    return [
      `${model.publicModel} 是 ${providerLabel} 在「${categoryLabel}」货架上的可售模型。`,
      `通过 Nebutra Router 使用 OpenAI 兼容接口调用，无需分别对接多家上游。`,
      model.sellable || model.routed
        ? "当前货架状态：可售 / 已配置路由。"
        : "当前为目录参考价，连通供给库存后即可按量调用。",
    ].join("");
  }, [model, providerLabel, categoryLabel]);

  const capabilities = useMemo(() => {
    const items: Array<{ title: string; body: string }> = [
      {
        title: "统一接入",
        body: "一套 API Key / Base URL 覆盖多厂商模型，切换 public model id 即可。",
      },
      {
        title: "按量计价",
        body: `输入 ${formatPrice(model.inputPerMTok)}/1M · 输出 ${formatPrice(model.outputPerMTok)}/1M（目录价，以实际出账为准）。`,
      },
      {
        title: "上下文",
        body: `公开上下文窗口约 ${model.context || "—"}，适合长对话与文档任务（以模型实际上限为准）。`,
      },
    ];
    if (model.category === "reasoning") {
      items.push({
        title: "推理向",
        body: "适合复杂规划、代码与多步工具调用场景。",
      });
    }
    if (model.category === "multimodal" || model.category === "image") {
      items.push({
        title: "多模态",
        body: "支持图文等跨模态输入（以模型能力声明为准）。",
      });
    }
    return items;
  }, [model]);

  const apis = useMemo(
    () => [
      {
        name: "Chat（聊天）",
        path: "/api/v1/chat/completions",
        method: "POST",
        stability: "稳定",
      },
      {
        name: "Chat（流式）",
        path: "/api/v1/chat/completions",
        method: "POST",
        stability: "稳定",
      },
    ],
    [],
  );

  async function copyForAi() {
    const text = [
      `模型: ${model.publicModel}`,
      `厂商: ${providerLabel}`,
      `分类: ${categoryLabel}`,
      `输入: ${formatPrice(model.inputPerMTok)}/1M`,
      `输出: ${formatPrice(model.outputPerMTok)}/1M`,
      `上下文: ${model.context || "—"}`,
      `接入: Nebutra Router OpenAI-compatible /api/v1/chat/completions`,
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

      {/* 顶区：封面 + 信息 + 指标 */}
      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1.1fr)_minmax(240px,280px)] xl:grid-cols-[260px_minmax(0,1.15fr)_minmax(260px,300px)] xl:gap-6">
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

          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--neutral-11)]">
            {blurb}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--neutral-3)] px-2.5 py-1 text-[11px] font-medium text-[var(--neutral-11)]">
              <BrandMark provider={provider} size={14} surface="light" />
              {categoryLabel}
            </span>
            {model.sellable || model.routed ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--status-success)_16%,white)] px-2.5 py-1 text-[11px] font-medium text-[var(--status-success)]">
                可售
              </span>
            ) : (
              <span className="rounded-full bg-[var(--neutral-3)] px-2.5 py-1 text-[11px] text-[var(--neutral-10)]">
                目录
              </span>
            )}
            <span className="text-[12px] text-[var(--neutral-9)]">
              上下文 {model.context || "—"}
            </span>
          </div>

          <dl className="mt-5 space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-4)]/80 py-1.5">
              <dt className="text-[var(--neutral-10)]">输入</dt>
              <dd className="font-mono font-medium text-[var(--blue-11)]">
                {formatPrice(model.inputPerMTok)}/1M tokens
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-4)]/80 py-1.5">
              <dt className="text-[var(--neutral-10)]">输出</dt>
              <dd className="font-mono font-medium text-[var(--blue-11)]">
                {formatPrice(model.outputPerMTok)}/1M tokens
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-[var(--neutral-10)]">厂商</dt>
              <dd className="font-medium text-[var(--neutral-12)]">{providerLabel}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px] text-[color:var(--status-warning)]">
            大额采购可联系支持获取专属价
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--neutral-6)] bg-white px-4 text-[13px] font-medium text-[var(--neutral-12)] transition hover:bg-[var(--neutral-2)]"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              查看文档
            </Link>
          </div>
        </div>

        <aside className="router-market-panel flex h-fit flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-[11px] leading-relaxed text-[var(--neutral-9)]">
            运行探针（成功率 / 延迟 / TPS）接入后在此展示；当前无上报数据。
          </p>
        </aside>
      </section>

      {/* 下区：TOC + 内容 */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)] xl:gap-6">
        <nav className="router-market-panel sticky top-4 h-fit space-y-0.5 p-2">
          {TOC.map((t) => (
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
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--neutral-11)]">{intro}</p>
            <hr className="my-5 border-[var(--neutral-5)]" />
            <h3 className="text-[14px] font-semibold text-[var(--blue-11)]">核心能力</h3>
            <ul className="mt-3 space-y-3">
              {capabilities.map((c) => (
                <li key={c.title} className="text-[13px] leading-relaxed text-[var(--neutral-11)]">
                  <span className="font-semibold text-[var(--neutral-12)]">{c.title}：</span>
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
            <div className="border-b border-[var(--neutral-5)] px-5 py-4 md:px-6">
              <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">Playground</h2>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center md:py-16">
              <PlaygroundEmptyArt />
              <p className="mt-6 text-[14px] text-[var(--neutral-10)]">
                登录后探索更多功能！ <AuthActions variant="compact" className="inline" />
              </p>
              <Link
                href={`/use?model=${encodeURIComponent(model.publicModel)}`}
                className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--neutral-12)] px-5 text-[13px] font-medium text-white transition hover:bg-[var(--neutral-11)]"
              >
                打开 Playground · {model.publicModel}
              </Link>
            </div>
          </article>

          <article
            id="pd-apis"
            className="router-market-panel scroll-mt-6 overflow-hidden p-0 md:p-0"
          >
            <div className="border-b border-[var(--neutral-5)] px-5 py-4 md:px-6">
              <h2 className="text-[16px] font-semibold text-[var(--neutral-12)]">
                API列表
                <span className="ml-2 text-[13px] font-normal text-[var(--neutral-9)]">
                  ({apis.length})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="bg-[var(--neutral-2)]/80 text-[12px] text-[var(--neutral-10)]">
                  <tr>
                    <th className="px-5 py-3 font-medium md:px-6">API描述</th>
                    <th className="px-3 py-3 font-medium">接口地址</th>
                    <th className="px-3 py-3 font-medium">方法</th>
                    <th className="px-3 py-3 font-medium">稳定性</th>
                    <th className="px-5 py-3 font-medium md:px-6">参数</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a.name} className="border-t border-[var(--neutral-5)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--neutral-12)] md:px-6">
                        {a.name}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-3.5 font-mono text-[12px] text-[var(--neutral-11)]">
                        {a.path}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-md bg-[var(--neutral-3)] px-1.5 py-0.5 text-[11px] font-semibold">
                          {a.method}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[var(--status-success)]">{a.stability}</td>
                      <td className="px-5 py-3.5 md:px-6">
                        <Link href="/docs" className="text-[var(--blue-11)] hover:underline">
                          查看详情
                        </Link>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-[var(--neutral-2)]/80 text-[12px] text-[var(--neutral-10)]">
                  <tr>
                    <th className="px-5 py-3 font-medium md:px-6">模型</th>
                    <th className="px-3 py-3 font-medium">上下文</th>
                    <th className="px-3 py-3 font-medium">输入</th>
                    <th className="px-3 py-3 font-medium">输出</th>
                    <th className="px-5 py-3 font-medium md:px-6">说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--neutral-5)]">
                    <td className="px-5 py-3.5 font-mono font-medium text-[var(--neutral-12)] md:px-6">
                      {model.publicModel}
                    </td>
                    <td className="px-3 py-3.5 tabular-nums">{model.context || "—"}</td>
                    <td className="px-3 py-3.5 font-mono text-[var(--blue-11)]">
                      {formatPrice(model.inputPerMTok)}/1M
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[var(--blue-11)]">
                      {formatPrice(model.outputPerMTok)}/1M
                    </td>
                    <td className="px-5 py-3.5 text-[var(--neutral-10)] md:px-6">目录价 · 按量</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <section id="pd-related" className="scroll-mt-6">
            <h2 className="mb-4 text-[16px] font-semibold text-[var(--neutral-12)]">猜你喜欢</h2>
            {related.length === 0 ? (
              <p className="text-[13px] text-[var(--neutral-10)]">暂无相关模型</p>
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
      <rect x="186" y="76" width="12" height="10" rx="2" fill="var(--blue-9)" opacity="0.7" />
      <path
        d="M188 76v-4a4 4 0 018 0v4"
        stroke="var(--blue-9)"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <circle cx="192" cy="120" r="8" fill="white" />
      <rect x="187" y="118" width="10" height="8" rx="2" fill="var(--blue-9)" opacity="0.55" />
      {/* person */}
      <circle cx="108" cy="72" r="16" fill="var(--blue-9)" opacity="0.85" />
      <path
        d="M84 148c4-28 12-44 24-48 14-5 28 4 36 22 6 14 8 28 8 40"
        fill="var(--blue-9)"
        opacity="0.8"
      />
      <path
        d="M92 100c-8 6-14 16-16 28"
        stroke="var(--blue-9)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M128 104c10 4 16 14 18 26"
        stroke="var(--blue-9)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
