"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { Badge, Input, Kbd } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ResultRow = {
  title: ReadonlyArray<{ text: string; mark?: boolean }>;
  path: string;
  score: string;
};

const RESULTS: readonly ResultRow[] = [
  {
    title: [
      { text: "Stripe " },
      { text: "billing", mark: true },
      { text: " " },
      { text: "migration", mark: true },
      { text: " plan" },
    ],
    path: "posts/2024/billing.md",
    score: "0.94",
  },
  {
    title: [{ text: "Tax + " }, { text: "billing", mark: true }, { text: " webhook retries" }],
    path: "posts/2024/webhooks.md",
    score: "0.71",
  },
] as const;

export function SearchGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="flex w-full flex-col gap-2 overflow-hidden p-3"
      aria-hidden="true"
    >
      <div className="pointer-events-none">
        <Input
          size="sm"
          readOnly
          tabIndex={-1}
          aria-label="Search preview"
          value="billing migration"
          prefix={<Search />}
          shortcut="⌘K"
        />
      </div>

      <ul className="m-0 flex flex-col gap-1.5 p-0">
        {RESULTS.map((row) => (
          <li
            key={row.path}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-background/40 px-2 py-1.5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12px] leading-tight text-foreground">
                {row.title.map((token, idx) =>
                  token.mark ? (
                    <mark
                      key={idx}
                      className="rounded-[var(--radius-sm)] bg-primary px-0.5 text-white"
                    >
                      {token.text}
                    </mark>
                  ) : (
                    <span key={idx}>{token.text}</span>
                  ),
                )}
              </span>
              <Badge
                variant="outline"
                size="sm"
                className="w-fit font-mono text-[10px] tracking-tight"
              >
                {row.path}
              </Badge>
            </div>
            <Kbd small className="font-mono text-[10px] tabular-nums">
              {row.score}
            </Kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
