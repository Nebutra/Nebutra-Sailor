import { Buildings, Check, Database, LockClosed } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const SQL_LINES: ReadonlyArray<{
  text: string;
  tone: "keyword" | "value" | "comment" | "result" | "plain";
}> = [
  { text: "SET LOCAL app.tenant_id = 'org_abc123';", tone: "keyword" },
  { text: "SELECT * FROM posts;", tone: "plain" },
  { text: "-- → 12 rows (tenant_abc only)", tone: "comment" },
];

const TONE_CLASS: Record<"keyword" | "value" | "comment" | "result" | "plain", string> = {
  keyword: "text-primary",
  value: "text-[var(--cyan-11)]",
  comment: "text-muted-foreground",
  result: "text-[var(--green-11)]",
  plain: "text-foreground",
};

export function TenantStoreGlyph(_props: SubpackageGlyphProps) {
  return (
    <div className="flex w-full flex-col gap-2 overflow-hidden p-3" style={{ height: 160 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Database className="h-3 w-3" />
          <span className="font-mono">postgres · RLS</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Buildings className="h-3 w-3" />
          <span className="font-mono">tenant scope</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-border bg-muted px-2.5 py-2 font-mono text-[10px] leading-snug">
        {SQL_LINES.map((line) => (
          <div key={line.text} className={`truncate ${TONE_CLASS[line.tone]}`}>
            {line.text}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Badge
          variant="green-subtle"
          className="flex items-center justify-start gap-1 px-2 py-1 text-[10px]"
        >
          <Check className="h-3 w-3 flex-shrink-0" />
          <span className="truncate font-mono">tenant_abc · 12 rows</span>
        </Badge>
        <Badge
          variant="gray-subtle"
          className="flex items-center justify-start gap-1 px-2 py-1 text-[10px]"
        >
          <LockClosed className="h-3 w-3 flex-shrink-0" />
          <span className="truncate font-mono">tenant_xyz · hidden</span>
        </Badge>
      </div>

      <div className="mt-auto flex items-center justify-between font-mono text-[9px] text-muted-foreground">
        <span>withTenant()</span>
        <span>AsyncLocalStorage scope</span>
      </div>
    </div>
  );
}
