"use client";

import { ChevronLeft, ChevronRight } from "@nebutra/icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandMark, BrandPill } from "@/components/brand-marks";
import { PROVIDER_LABEL } from "@/lib/listing-catalog";
import type { MarketBanner } from "@/lib/market-banners";

const AUTO_MS = 5200;

/**
 * 302 中部「滚动图轴」— 多帧运营/实测海报，不是单帧 hero。
 * 背景：纯黑物料构图；有 coverSrc 用图，否则中性暗底 + 品牌叠层（禁止酸色 radial）。
 */
export function MarketBannerCarousel({ banners }: { banners: readonly MarketBanner[] }) {
  const slides = banners.length > 0 ? banners : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const len = slides.length;
  const go = useCallback(
    (dir: -1 | 1) => {
      if (len === 0) return;
      setIndex((i) => (i + dir + len) % len);
    },
    [len],
  );

  useEffect(() => {
    if (len <= 1 || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [len, paused]);

  if (len === 0) {
    return (
      <section className="flex min-h-[300px] items-center justify-center rounded-[20px] bg-[var(--neutral-12)] text-[var(--neutral-8)] md:min-h-[340px]">
        <p className="text-[14px]">暂无轮播物料</p>
      </section>
    );
  }

  const current = slides[index] ?? slides[0];
  if (!current) {
    return null;
  }

  return (
    <section
      className="relative h-full min-h-[300px] overflow-hidden rounded-[22px] bg-[color-mix(in_srgb,var(--blue-3)_22%,white)] text-[var(--neutral-12)] shadow-[0_16px_48px_rgb(15_23_42/0.09)] ring-1 ring-black/[0.04] md:min-h-[320px] xl:min-h-[340px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="模型实测轮播"
    >
      {slides.map((b, i) => (
        <Slide key={b.id} banner={b} active={i === index} />
      ))}

      {/* 左右箭头 */}
      {len > 1 ? (
        <>
          <button
            type="button"
            aria-label="上一帧"
            onClick={() => go(-1)}
            className="absolute top-1/2 left-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/55 text-[var(--neutral-12)] shadow-sm backdrop-blur-md transition hover:bg-white/80"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="下一帧"
            onClick={() => go(1)}
            className="absolute top-1/2 right-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/55 text-[var(--neutral-12)] shadow-sm backdrop-blur-md transition hover:bg-white/80"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : null}

      {/* 点指示器 */}
      {len > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {slides.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`第 ${i + 1} 帧`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={[
                "h-1.5 rounded-full transition-all",
                i === index
                  ? "w-5 bg-[var(--neutral-12)]/80"
                  : "w-1.5 bg-[var(--neutral-12)]/25 hover:bg-[var(--neutral-12)]/45",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}

      <span className="sr-only">
        当前：{current.title}（{index + 1}/{len}）
      </span>
    </section>
  );
}

function Slide({ banner, active }: { banner: MarketBanner; active: boolean }) {
  const isArt = Boolean(banner.coverSrc);

  return (
    <Link
      href={banner.href}
      className={[
        "absolute inset-0 block transition-opacity duration-500",
        active ? "z-10 opacity-100" : "z-0 pointer-events-none opacity-0",
      ].join(" ")}
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
    >
      {/* 背景：2026 弥散物料 full-bleed；无图用软 mesh 底 */}
      {banner.coverSrc ? (
        <img
          src={banner.coverSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 85% 30%, color-mix(in srgb, var(--blue-4) 55%, white) 0%, transparent 55%), radial-gradient(90% 80% at 20% 80%, color-mix(in srgb, var(--cyan-4) 40%, white) 0%, transparent 50%), linear-gradient(135deg, #f4f6ff 0%, #eef2ff 45%, #f8fafc 100%)",
          }}
          aria-hidden
        />
      )}

      {/* 轻磨砂叠层：保留弥散色，只抬文字可读 */}
      <div
        className="absolute inset-0"
        style={{
          background: isArt
            ? "linear-gradient(105deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 36%, rgba(255,255,255,0.05) 58%, rgba(255,255,255,0.35) 100%)"
            : "linear-gradient(105deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.4) 100%)",
        }}
        aria-hidden
      />

      <div className="relative flex h-full min-h-[280px] flex-col justify-between p-6 md:min-h-[320px] md:p-8 xl:min-h-[340px]">
        {isArt ? (
          /* 模态叙事帧：深色字叠在浅弥散物料上 */
          <>
            <div className="max-w-[54%]">
              <p className="text-[13px] font-medium tracking-wide text-[var(--neutral-10)]">
                {banner.kicker}
              </p>
              <h2 className="mt-3.5 text-[32px] leading-[1.12] font-semibold tracking-tight text-[var(--neutral-12)] md:text-[40px]">
                {banner.title}
              </h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--neutral-11)] md:text-[15px]">
                {banner.subtitle}
              </p>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="text-[11px] tracking-wide text-[var(--neutral-9)]">
                API 集市 · 可售货架
              </span>
              <span className="rounded-full bg-[var(--neutral-12)] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm">
                查看全部
              </span>
            </div>
          </>
        ) : (
          /* 旗舰型号帧：浅底 + 品牌 mark */
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <p className="text-[12px] font-medium tracking-wide text-[var(--neutral-10)]">
                  {PROVIDER_LABEL[banner.provider]} · {banner.kicker}
                </p>
                <div className="flex items-center gap-3.5">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/70 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md">
                    <BrandMark provider={banner.provider} size={36} surface="light" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-mono text-[28px] leading-none font-semibold tracking-tight text-[var(--neutral-12)] md:text-[36px]">
                      {banner.title}
                    </h2>
                    <p
                      className="mt-2 line-clamp-1 text-[14px] text-[var(--neutral-10)]"
                      title={banner.subtitle}
                    >
                      {banner.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden min-w-0 max-w-[42%] shrink flex-col items-end text-right sm:flex">
                <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--neutral-9)] uppercase">
                  Model Review
                </p>
                {/* 大号型号字：不 truncate，用 clamp 字号 + 可换行保证完整可见 */}
                <p
                  className="mt-1 w-full text-right font-bold leading-[1.05] tracking-tight break-words text-[var(--neutral-12)]"
                  style={{
                    fontSize: "clamp(1.5rem, 2.6vw, 2.75rem)",
                  }}
                  title={banner.publicModel}
                >
                  {shortHeadline(banner.publicModel)}
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-xl border border-white/80 bg-white/85 px-2 py-1.5 shadow-sm backdrop-blur-sm">
                  <BrandPill provider={banner.provider} size={16} tone="light" />
                </span>
                {banner.priceLine ? (
                  <span className="font-mono text-[11px] text-[var(--neutral-10)]">
                    {banner.priceLine}
                  </span>
                ) : null}
              </div>
              <span className="rounded-full bg-[var(--neutral-12)] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm">
                立即体验
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

function shortHeadline(id: string): string {
  // 展示完整可读型号：把 kebab 改成空格，不再硬截断（CSS clamp 负责缩放）
  const parts = id.split(/[-_/]/).filter(Boolean);
  if (parts.length === 0) return id;
  // grok-4.3 → "grok 4.3"；claude-sonnet-5 → "sonnet 4.6" 风格取末两段若过长
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? "";
    const prev = parts[parts.length - 2] ?? "";
    if (/^\d/.test(last) || last.length <= 6) {
      return `${prev} ${last}`;
    }
  }
  // 过长 id：用空格连全段，由字号 clamp 适配，不砍字
  return parts.join(" ");
}
