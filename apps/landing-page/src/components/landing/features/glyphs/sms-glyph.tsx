"use client";

import { Check, Clock, Message } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * SmsGlyph — mini conversation card for the `sms` sub-package.
 *
 * Shows a single iMessage-style OTP bubble with a delivery metadata row
 * and a Twilio provider chip. Composed entirely from @nebutra/ui
 * primitives + @nebutra/icons — no hand-rolled SVG geometry.
 */
export function SmsGlyph({ locale }: SubpackageGlyphProps) {
  const message =
    locale === "zh"
      ? "您的 Nebutra 验证码是 8472，5 分钟后过期。"
      : "Your Nebutra OTP is 8472. Expires in 5 minutes.";

  const deliveredLabel = locale === "zh" ? "已送达" : "delivered";

  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--neutral-2)]"
      style={{ height: 160 }}
    >
      {/* Top row — provider chip + channel label */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-11)]">
          <Message className="h-3 w-3" />
          <span>SMS</span>
        </div>
        <Badge variant="green-subtle" size="sm" dot>
          Twilio
        </Badge>
      </div>

      {/* Message bubble */}
      <div className="px-4 pt-3">
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-[var(--radius-2xl)] rounded-br-md bg-primary/15 px-3 py-2 text-[11px] leading-snug text-foreground">
            {message}
          </div>
        </div>

        {/* Delivery check just below the bubble, right-aligned */}
        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[var(--neutral-10)]">
          <Check className="h-2.5 w-2.5 text-success" />
          <span>{deliveredLabel}</span>
        </div>
      </div>

      {/* Meta row — phone · delivered · latency */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 px-4 font-mono text-[10px] text-[var(--neutral-10)]">
        <span>+1 415 &middot;&middot;&middot; 0188</span>
        <span className="text-[var(--neutral-8)]">·</span>
        <span className="text-[var(--neutral-11)]">{deliveredLabel}</span>
        <span className="text-[var(--neutral-8)]">·</span>
        <span className="inline-flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          1.2s
        </span>
      </div>
    </div>
  );
}
