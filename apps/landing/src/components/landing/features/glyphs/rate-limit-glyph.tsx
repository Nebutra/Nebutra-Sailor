"use client";

import { ArrowRight, Clock, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

type DecisionRow = {
  path: string;
  status: string;
  detail: string;
  variant: "green-subtle" | "amber-subtle";
};

const TOKEN_TOTAL = 10;
const TOKENS_LEFT = 7;

const DECISIONS: readonly DecisionRow[] = [
  { path: "/api/posts", status: "200 ok", detail: "87 left", variant: "green-subtle" },
  {
    path: "/api/users",
    status: "429 throttled",
    detail: "retry-after 12s",
    variant: "amber-subtle",
  },
] as const;

const COPY = {
  en: {
    header: "rate · 100 req/s · token bucket",
    footer: "per-tenant · 8ms p99",
  },
  zh: {
    header: "限速 · 100 req/s · 令牌桶",
    footer: "按租户 · 8ms p99",
  },
} as const;

/**
 * RateLimitGlyph — bespoke thumbnail for the `rate-limit` sub-package.
 *
 * Renders a token bucket as a row of 10 dots (7 filled, 3 outline) with two
 * recent decision rows (200 ok, 429 throttled) so the card communicates
 * "token bucket rate limiter, per-tenant decisions" at a glance.
 */
export function RateLimitGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <header className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Lightning className="h-3 w-3 text-[hsl(var(--primary))]" />
        <span className="truncate text-foreground">{copy.header}</span>
      </header>

      <div
        className="flex items-center gap-1.5"
        role="img"
        aria-label={`${TOKENS_LEFT} of ${TOKEN_TOTAL} tokens left`}
      >
        {Array.from({ length: TOKEN_TOTAL }, (_, i) => {
          const filled = i < TOKENS_LEFT;
          return (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full"
              style={
                filled
                  ? { background: "hsl(var(--primary))" }
                  : {
                      background: "transparent",
                      border: "1px solid hsl(var(--border))",
                    }
              }
            />
          );
        })}
        <span className="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground">
          {TOKENS_LEFT}/{TOKEN_TOTAL}
        </span>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[10px] leading-tight">
        {DECISIONS.map((row) => (
          <li key={row.path} className="flex items-center gap-1.5 text-foreground">
            <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{row.path}</span>
            <Badge variant={row.variant} size="sm" className="px-1.5 py-0 text-[9px] font-medium">
              {row.status}
            </Badge>
            <span className="ml-auto shrink-0 truncate text-muted-foreground">{row.detail}</span>
          </li>
        ))}
      </ul>

      <footer className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="truncate">{copy.footer}</span>
      </footer>
    </div>
  );
}
