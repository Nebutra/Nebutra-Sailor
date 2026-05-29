import { Clock, FileText, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

type LogLine = {
  level: LogLevel;
  event: string;
  fields: string;
  dotColor: string;
  levelColor: string;
};

const LINES: ReadonlyArray<LogLine> = [
  {
    level: "INFO",
    event: "user.signup",
    fields: "userId=usr_8c41   tenantId=org_abc",
    dotColor: "var(--blue-9)",
    levelColor: "var(--blue-11)",
  },
  {
    level: "WARN",
    event: "cache.miss",
    fields: "key=user:abc       3ms",
    dotColor: "var(--status-warning)",
    levelColor: "var(--status-warning)",
  },
  {
    level: "ERROR",
    event: "payment.failed",
    fields: "orderId=ord_5a18   code=card_declined",
    dotColor: "var(--status-danger)",
    levelColor: "var(--status-danger)",
  },
  {
    level: "DEBUG",
    event: "tenant.resolve",
    fields: "tenantId=org_xyz   1ms",
    dotColor: "var(--neutral-9)",
    levelColor: "var(--neutral-10)",
  },
] as const;

export function LoggerGlyph({ entry: _entry, locale: _locale }: SubpackageGlyphProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--neutral-2)]"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <Badge variant="gray-subtle" className="gap-1 font-mono text-[10px]">
          <Sparkles className="h-3 w-3" />
          Sentry connected
        </Badge>
      </div>

      <div className="flex h-full flex-col justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-[var(--neutral-10)]" />
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--neutral-10)]">
            logs.stream
          </span>
        </div>

        <div className="flex flex-col gap-1 font-mono text-[10px] leading-tight">
          {LINES.map((line) => (
            <LogRow key={line.level} line={line} />
          ))}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--neutral-10)]">
          <Clock className="h-3 w-3" />
          <span>trace-id propagated &middot; 4 sinks</span>
        </div>
      </div>
    </div>
  );
}

function LogRow({ line }: { line: LogLine }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: line.dotColor }}
      />
      <span
        className="inline-block w-12 flex-shrink-0 font-semibold"
        style={{ color: line.levelColor }}
      >
        [{line.level}]
      </span>
      <span className="flex-shrink-0 text-[var(--neutral-12)]">{line.event}</span>
      <span className="truncate text-[var(--neutral-10)]">{line.fields}</span>
    </div>
  );
}
