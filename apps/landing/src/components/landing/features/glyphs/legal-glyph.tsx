"use client";

import { BookClosed, Check, FileText, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    header: "legal · versioned",
    docs: [
      { title: "Terms of Service", version: "v2.4", updated: "Updated 12d ago" },
      { title: "Privacy Policy", version: "v3.1", updated: "Updated 4d ago", tag: "GDPR" },
      { title: "Refund Policy", version: "v1.2", updated: "Updated 30d ago" },
    ],
    footer: "consents tracked · auditable",
  },
  zh: {
    header: "legal · versioned",
    docs: [
      { title: "服务条款", version: "v2.4", updated: "12 天前更新" },
      { title: "隐私政策", version: "v3.1", updated: "4 天前更新", tag: "GDPR" },
      { title: "退款政策", version: "v1.2", updated: "30 天前更新" },
    ],
    footer: "consents tracked · auditable",
  },
} as const;

/**
 * LegalGlyph
 *
 * Versioned legal content preview. Header pairs a closed-book icon with
 * a mono "legal · versioned" label and a verified shield. Three stacked
 * doc rows each show a FileText icon, the document title, a version
 * Badge (and a GDPR Badge on the privacy policy), plus a muted relative
 * "Updated" timestamp. Footer hints at consent tracking + auditability.
 */
export function LegalGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <BookClosed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate font-mono text-[10px] text-muted-foreground">{copy.header}</span>
        <Shield className="ml-auto h-3 w-3 shrink-0 text-success" aria-hidden="true" />
        <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
      </div>

      {/* Doc rows */}
      <div className="flex flex-1 flex-col justify-between gap-1">
        {copy.docs.map((doc) => (
          <DocRow
            key={doc.title}
            title={doc.title}
            version={doc.version}
            updated={doc.updated}
            tag={"tag" in doc ? doc.tag : undefined}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="font-mono text-[10px] text-muted-foreground">→ {copy.footer}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Doc row
// ---------------------------------------------------------------------------

interface DocRowProps {
  title: string;
  version: string;
  updated: string;
  tag?: string;
}

function DocRow({ title, version, updated, tag }: DocRowProps) {
  return (
    <div className="flex items-center gap-2">
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate text-[11px] text-foreground">{title}</span>
      <Badge variant="gray-subtle" size="sm" className="font-mono text-[10px]">
        {version}
      </Badge>
      {tag ? (
        <Badge variant="gray-subtle" size="sm" className="font-mono text-[10px]">
          {tag}
        </Badge>
      ) : null}
      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{updated}</span>
    </div>
  );
}
