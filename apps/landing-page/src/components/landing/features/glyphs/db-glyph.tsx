"use client";

import { Check, Cross, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * DbGlyph — mini Prisma + tenant RLS card.
 *
 * Top: a mono code line `prisma.post.findMany({ tenantId })` with subtle
 * syntax tinting. Below: a 3-row results table where the third row is
 * line-through muted — the row from another tenant that RLS suppressed.
 * Footer: green-subtle "RLS · enforced" badge with a Shield icon.
 */

type ResultRow = {
  id: string;
  label: string;
  blocked?: boolean;
};

const ROWS: ReadonlyArray<ResultRow> = [
  { id: "post_1234", label: "published" },
  { id: "post_5678", label: "published" },
  { id: "post_9999", label: "OTHER TENANT", blocked: true },
];

const COPY = {
  en: { badge: "RLS · enforced" },
  zh: { badge: "RLS · 已启用" },
} as const;

export function DbGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Code line */}
        <div className="rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-2 py-1.5 ring-1 ring-[var(--neutral-5)]">
          <code className="font-mono text-[10px] leading-none">
            <span className="text-[var(--neutral-10)]">prisma</span>
            <span className="text-[var(--neutral-11)]">.</span>
            <span className="text-[var(--neutral-12)]">post</span>
            <span className="text-[var(--neutral-11)]">.</span>
            <span className="text-[var(--blue-11)]">findMany</span>
            <span className="text-[var(--neutral-11)]">{"({ "}</span>
            <span className="text-[var(--cyan-11)]">tenantId</span>
            <span className="text-[var(--neutral-11)]">{" })"}</span>
          </code>
        </div>

        {/* Result rows */}
        <div className="flex flex-col gap-1">
          {ROWS.map((row) => {
            const blocked = row.blocked === true;
            return (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-2 py-1 ring-1 ring-[var(--neutral-5)]"
              >
                {blocked ? (
                  <Cross className="h-3 w-3 shrink-0 text-[var(--neutral-10)]" aria-hidden="true" />
                ) : (
                  <Check className="h-3 w-3 shrink-0 text-[var(--green-9)]" aria-hidden="true" />
                )}
                <span
                  className={`truncate font-mono text-[10px] ${
                    blocked ? "text-[var(--neutral-9)] line-through" : "text-[var(--neutral-12)]"
                  }`}
                >
                  {row.id}
                </span>
                <span
                  className={`ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wide ${
                    blocked ? "text-[var(--neutral-9)] line-through" : "text-[var(--neutral-10)]"
                  }`}
                >
                  {row.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center">
          <Badge variant="green-subtle" size="sm" icon={<Shield />}>
            {t.badge}
          </Badge>
        </div>
      </div>
    </div>
  );
}
