"use client";

import {
  Copy,
  Link as LinkIcon,
  LogoLinkedinSmall,
  LogoReddit,
  LogoTwitterXSmall,
  Share,
} from "@nebutra/icons";
import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";

type BlogShareActionsProps = {
  excerpt?: string | null;
  isZh: boolean;
  title: string;
  url: string;
};

type IntentShareItem = {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

type CopyShareItem = {
  label: string;
  monogram: string;
  value: string;
};

function buildShareText(title: string, url: string, excerpt?: string | null): string {
  const summary = excerpt?.trim();
  return [title.trim(), summary, url].filter(Boolean).join("\n\n");
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function BlogShareActions({ excerpt, isZh, title, url }: BlogShareActionsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const shareText = useMemo(() => buildShareText(title, url, excerpt), [excerpt, title, url]);

  const internationalShareItems: IntentShareItem[] = [
    {
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: LogoTwitterXSmall,
      label: "X",
    },
    {
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: LogoLinkedinSmall,
      label: "LinkedIn",
    },
    {
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      icon: LogoReddit,
      label: "Reddit",
    },
  ];

  const domesticShareItems: CopyShareItem[] = [
    { label: isZh ? "微信" : "WeChat", monogram: "微", value: shareText },
    { label: isZh ? "小红书" : "XHS", monogram: "小", value: shareText },
    { label: "知乎", monogram: "知", value: shareText },
  ];

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: excerpt ?? undefined, title, url });
        return;
      } catch {
        // User cancellation should fall through to copy, which still gives a useful action.
      }
    }

    if (await copyToClipboard(url)) {
      setCopied("native");
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  async function handleCopy(key: string, value: string) {
    if (await copyToClipboard(value)) {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  const copyLabel = copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制链接" : "Copy link";

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--neutral-10)]">
          {isZh ? "分发" : "Share"}
        </p>
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
        >
          <Share className="size-3.5" aria-hidden />
          {isZh ? "系统分享" : "Native"}
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <div>
          <p className="mb-2 text-xs text-[var(--neutral-10)]">
            {isZh ? "国际平台" : "International"}
          </p>
          <div className="flex flex-wrap gap-2">
            {internationalShareItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--neutral-7)] text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                  aria-label={`${isZh ? "分享到" : "Share to"} ${item.label}`}
                  title={item.label}
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => handleCopy("link", url)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] px-3 py-2 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
            >
              <Copy className="size-3.5" aria-hidden />
              {copyLabel}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-[var(--neutral-10)]">
            {isZh ? "国内平台（复制后发布）" : "China platforms"}
          </p>
          <div className="flex flex-wrap gap-2">
            {domesticShareItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleCopy(item.label, item.value)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                aria-label={`${isZh ? "复制到" : "Copy for"} ${item.label}`}
                title={copied === item.label ? (isZh ? "已复制" : "Copied") : item.label}
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--neutral-12)] text-[10px] font-semibold text-[var(--neutral-1)]">
                  {item.monogram}
                </span>
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleCopy("rich", shareText)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
            >
              <LinkIcon className="size-3.5" aria-hidden />
              {copied === "rich"
                ? isZh
                  ? "已复制"
                  : "Copied"
                : isZh
                  ? "复制全文卡片"
                  : "Copy card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
