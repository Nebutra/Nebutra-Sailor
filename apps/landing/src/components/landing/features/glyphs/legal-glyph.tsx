"use client";

import { BookClosed, Check, FileText, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// Document versions and regulation tags — same on every locale.
const DOCS: ReadonlyArray<{ version: string; tag?: string }> = [
  { version: "v2.4" },
  { version: "v3.1", tag: "GDPR" },
  { version: "v1.2" },
];

type LegalCopy = {
  header: string;
  docs: Record<string, { title: string; updated: string }>;
  footer: string;
};

/**
 * LegalGlyph
 *
 * Versioned legal content preview. Header pairs a closed-book icon with
 * a mono "legal · versioned" label and a verified shield. Three stacked
 * doc rows each show a FileText icon, the document title, a version
 * Badge (and a GDPR Badge on the privacy policy), plus a muted relative
 * "Updated" timestamp. Footer hints at consent tracking + auditability.
 */
export function LegalGlyph({ copy: rawCopy }: SubpackageGlyphProps) {
  const copy = rawCopy as LegalCopy;
  const docs = DOCS.map((doc, i) => ({ ...doc, ...copy.docs[i] }));

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
        <Shield className="ml-auto h-3 w-3 shrink-0 text-success-strong" aria-hidden="true" />
        <Check className="h-3 w-3 shrink-0 text-success-strong" aria-hidden="true" />
      </div>

      {/* Doc rows */}
      <div className="flex flex-1 flex-col justify-between gap-1">
        {docs.map((doc) => (
          <DocRow
            key={doc.version}
            title={doc.title ?? ""}
            version={doc.version}
            updated={doc.updated ?? ""}
            tag={doc.tag}
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
