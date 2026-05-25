"use client";

import { ArrowRight, Code, Database } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * RepositoriesGlyph — Repository pattern interface preview.
 *
 * Top: mono `interface PostRepository` header.
 * Middle: 4 method signature rows in mono code-style.
 * Below: 3 provider chips (Prisma · Drizzle · in-memory).
 * Footer: mono "swap impl via DI" tagline.
 */

type MethodRow = {
  name: string;
  args: string;
  returns: string;
};

const METHODS: ReadonlyArray<MethodRow> = [
  { name: "findById", args: "id", returns: "Post | null" },
  { name: "findAll", args: "filters", returns: "Post[]" },
  { name: "create", args: "data", returns: "Post" },
  { name: "update", args: "id, data", returns: "Post" },
];

const PROVIDERS = ["Prisma", "Drizzle", "in-memory"] as const;

const COPY = {
  en: { footer: "swap impl via DI" },
  zh: { footer: "通过 DI 切换实现" },
} as const;

export function RepositoriesGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-1.5 rounded-lg bg-[var(--neutral-1)] p-2.5 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Interface header */}
        <div className="flex items-center gap-1.5">
          <Code className="h-3 w-3 shrink-0 text-[var(--blue-9)]" aria-hidden="true" />
          <code className="font-mono text-[10px] leading-none">
            <span className="text-[var(--blue-11)]">interface</span>
            <span className="text-[var(--neutral-11)]"> </span>
            <span className="text-[var(--neutral-12)]">PostRepository</span>
          </code>
        </div>

        {/* Method rows */}
        <div className="flex flex-col gap-0.5 rounded-md bg-[var(--neutral-2)] px-2 py-1.5 ring-1 ring-[var(--neutral-5)]">
          {METHODS.map((m) => (
            <code
              key={m.name}
              className="flex items-center gap-1 font-mono text-[9px] leading-tight"
            >
              <span className="text-[var(--cyan-11)]">{m.name}</span>
              <span className="text-[var(--neutral-11)]">(</span>
              <span className="text-[var(--neutral-10)]">{m.args}</span>
              <span className="text-[var(--neutral-11)]">)</span>
              <ArrowRight
                className="h-2.5 w-2.5 shrink-0 text-[var(--neutral-9)]"
                aria-hidden="true"
              />
              <span className="text-[var(--neutral-10)]">Promise{"<"}</span>
              <span className="text-[var(--neutral-12)]">{m.returns}</span>
              <span className="text-[var(--neutral-10)]">{">"}</span>
            </code>
          ))}
        </div>

        {/* Provider chips */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {PROVIDERS.map((p) => (
            <Badge key={p} variant="outline" size="sm" icon={<Database />}>
              {p}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center">
          <code className="font-mono text-[9px] text-[var(--neutral-10)]">
            {"// "}
            {t.footer}
          </code>
        </div>
      </div>
    </div>
  );
}
