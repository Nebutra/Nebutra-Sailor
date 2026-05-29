"use client";

import { ArrowRight, Check, Clock, Globe } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    url: "https://example.com/checkout",
    footer: "Playwright · Chromium · headless",
  },
  zh: {
    url: "https://example.com/checkout",
    footer: "Playwright · Chromium · 无头模式",
  },
} as const;

type Action = {
  label: string;
  state: "done" | "pending";
};

const ACTIONS: readonly Action[] = [
  { label: '→ click "Add to cart"', state: "done" },
  { label: '→ fill input "Email"', state: "done" },
  { label: "→ wait for [data-testid=confirm]", state: "pending" },
] as const;

export function BrowserControlGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-2.5 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-[var(--neutral-5)] pb-1.5">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--red-9)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber-9)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
          </div>
          <div className="flex flex-1 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--neutral-2)] px-1.5 py-0.5">
            <Globe className="h-2.5 w-2.5 text-[var(--neutral-10)]" />
            <span className="font-mono text-[9px] text-[var(--neutral-11)]">{copy.url}</span>
          </div>
        </div>

        {/* Action rows */}
        <div className="flex flex-col gap-1">
          {ACTIONS.map((action) => (
            <div key={action.label} className="flex items-center gap-2">
              <Badge
                variant={action.state === "done" ? "green-subtle" : "blue-subtle"}
                size="sm"
                className="flex-shrink-0 gap-0.5"
              >
                {action.state === "done" ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <Clock className="h-2.5 w-2.5 animate-pulse" />
                )}
              </Badge>
              <span className="flex-1 truncate font-mono text-[9px] text-[var(--neutral-12)]">
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--neutral-5)] pt-1">
          <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--neutral-10)]">
            <ArrowRight className="h-2.5 w-2.5" />
            {copy.footer}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
