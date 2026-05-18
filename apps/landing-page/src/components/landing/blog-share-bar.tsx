"use client";

import { Check, Copy, Link as LinkIcon } from "@nebutra/icons";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BLOG_SHARE_GROUPS,
  type BlogSharePayload,
  type BlogSharePlatform,
  getBlogShareIconUrl,
  getBlogShareText,
} from "@/lib/blog-share-platforms";

type BlogShareBarProps = BlogSharePayload & {
  locale: "en" | "zh";
  variant?: "rail" | "inline";
};

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function BrandIcon({ platform }: { platform: BlogSharePlatform }) {
  const [failed, setFailed] = useState(false);
  const iconUrl = getBlogShareIconUrl(platform);

  if (!iconUrl || failed) {
    return (
      <span className="grid size-4 place-items-center font-mono text-[10px] font-semibold">
        {platform.fallbackGlyph}
      </span>
    );
  }

  return (
    <Image
      src={iconUrl}
      alt=""
      width={16}
      height={16}
      className="size-4 opacity-75 grayscale"
      loading="lazy"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

export function BlogShareBar({ url, title, excerpt, locale, variant = "rail" }: BlogShareBarProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const payload = { url, title, excerpt };
  const isZh = locale === "zh";

  useEffect(() => {
    setNativeShareAvailable(Boolean(navigator.share));
  }, []);

  useEffect(() => {
    if (!copiedPlatform) return;
    const timeout = window.setTimeout(() => setCopiedPlatform(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedPlatform]);

  const handlePlatformClick = async (platform: BlogSharePlatform) => {
    if (platform.action === "intent" && platform.buildIntentUrl) {
      window.open(platform.buildIntentUrl(payload), "_blank", "noopener,noreferrer");
      return;
    }

    await copyText(getBlogShareText(payload));
    setCopiedPlatform(platform.id);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, text: excerpt ?? title, url });
      return;
    }
    await copyText(getBlogShareText(payload));
    setCopiedPlatform("native");
  };

  return (
    <section
      aria-label={isZh ? "分享文章" : "Share article"}
      className={
        variant === "rail"
          ? "rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4"
          : "rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--neutral-12)]">
          {isZh ? "转发到" : "Share to"}
        </p>
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)] transition-colors hover:border-[var(--neutral-8)] hover:text-[var(--neutral-12)]"
          title={
            nativeShareAvailable
              ? isZh
                ? "系统分享"
                : "Native share"
              : isZh
                ? "复制链接"
                : "Copy link"
          }
        >
          {copiedPlatform === "native" ? (
            <Check className="size-3.5" aria-hidden />
          ) : nativeShareAvailable ? (
            <LinkIcon className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          <span>
            {copiedPlatform === "native" ? (isZh ? "已复制" : "Copied") : isZh ? "链接" : "Link"}
          </span>
        </button>
      </div>

      <div className={variant === "rail" ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        {BLOG_SHARE_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-medium text-[var(--neutral-10)]">
              {group.label[locale]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.platforms.map((platform) => {
                const copied = copiedPlatform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformClick(platform)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-1.5 text-xs font-medium text-[var(--neutral-11)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                    data-region={platform.region}
                    data-compliance-zone={platform.complianceZone}
                  >
                    {copied ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <BrandIcon platform={platform} />
                    )}
                    <span>{copied ? (isZh ? "已复制" : "Copied") : platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
