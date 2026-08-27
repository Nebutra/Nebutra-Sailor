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
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-background p-2.5 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Interface header */}
        <div className="flex items-center gap-1.5">
          <Code className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
          <code className="font-mono text-[10px] leading-none">
            <span className="text-primary">interface</span>
            <span className="text-muted-foreground"> </span>
            <span className="text-foreground">PostRepository</span>
          </code>
        </div>

        {/* Method rows */}
        <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-muted px-2 py-1.5 ring-1 ring-[hsl(var(--border))]">
          {METHODS.map((m) => (
            <code
              key={m.name}
              className="flex items-center gap-1 font-mono text-[9px] leading-tight"
            >
              <span className="text-[var(--cyan-11)]">{m.name}</span>
              <span className="text-muted-foreground">(</span>
              <span className="text-muted-foreground">{m.args}</span>
              <span className="text-muted-foreground">)</span>
              <ArrowRight
                className="h-2.5 w-2.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">Promise{"<"}</span>
              <span className="text-foreground">{m.returns}</span>
              <span className="text-muted-foreground">{">"}</span>
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
          <code className="font-mono text-[9px] text-muted-foreground">
            {"// "}
            {t.footer}
          </code>
        </div>
      </div>
    </div>
  );
}
