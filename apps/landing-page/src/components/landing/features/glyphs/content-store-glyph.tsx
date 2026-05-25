import { BookClosed, Check, Database, FileText } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ContentRow = {
  name: string;
  chunks: string;
};

const ROWS: ContentRow[] = [
  { name: "pricing-2025.md", chunks: "48 chunks" },
  { name: "eu-gdpr.pdf", chunks: "127 chunks" },
  { name: "q4-revenue.csv", chunks: "12 chunks" },
];

export function ContentStoreGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 overflow-hidden rounded-md bg-[var(--neutral-1)] p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--neutral-11)]">
        <Database className="h-3 w-3" />
        <span>content_store</span>
        <span className="text-[var(--neutral-9)]">·</span>
        <span>12,401 chunks</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {ROWS.map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-2 rounded-sm border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-2 py-1"
          >
            <FileText className="h-3 w-3 shrink-0 text-[var(--neutral-11)]" />
            <span className="truncate font-mono text-[10px] text-[var(--neutral-12)]">
              {row.name}
            </span>
            <span className="font-mono text-[9px] text-[var(--neutral-10)]">{row.chunks}</span>
            <div className="ml-auto">
              <Badge
                variant="outline"
                color="green-subtle"
                className="gap-1 px-1.5 py-0 text-[9px]"
              >
                <Check className="h-2.5 w-2.5" />
                embedded
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--neutral-10)]">
        <BookClosed className="h-3 w-3" />
        <span>1,536-dim embeddings</span>
        <span className="text-[var(--neutral-9)]">·</span>
        <span>tenant-scoped</span>
      </div>
    </div>
  );
}
