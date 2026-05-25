"use client";

import { Check, Clock, Envelope } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    recipient: "user@example.com",
    delivered: "delivered",
    subject: "Welcome to Nebutra",
    preview: "Thanks for joining — your workspace is ready.",
    provider: "Resend",
    timestamp: "2m ago",
  },
  zh: {
    recipient: "user@example.com",
    delivered: "已送达",
    subject: "欢迎加入 Nebutra",
    preview: "感谢加入 — 你的工作区已就绪。",
    provider: "Resend",
    timestamp: "2 分钟前",
  },
} as const;

export function EmailGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2 rounded-lg bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Top row: envelope + recipient + delivered badge */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--neutral-3)] text-[var(--neutral-11)]">
            <Envelope className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-mono text-[11px] text-[var(--neutral-11)]">
            {copy.recipient}
          </span>
          <Badge variant="green-subtle" size="sm" className="ml-auto" icon={<Check />}>
            {copy.delivered}
          </Badge>
        </div>

        {/* Middle: subject + preview */}
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-[13px] font-semibold text-[var(--neutral-12)]">
            {copy.subject}
          </p>
          <p className="truncate text-[11px] text-[var(--neutral-10)]">{copy.preview}</p>
        </div>

        {/* Bottom: provider chip + timestamp */}
        <div className="mt-0.5 flex items-center justify-between">
          <Badge variant="gray-subtle" size="sm">
            {copy.provider}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-[var(--neutral-10)]">
            <Clock className="h-3 w-3" />
            {copy.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
