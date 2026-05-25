import { Bug, Cross } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Severity = "error" | "warn" | "info";

type ErrorRow = {
  time: string;
  severity: Severity;
  label: string;
  code: string;
  occurrences: string;
};

const ROWS: ReadonlyArray<ErrorRow> = [
  {
    time: "2m ago",
    severity: "error",
    label: "ERROR",
    code: "BILLING_PROVIDER_TIMEOUT",
    occurrences: "1 occurrence",
  },
  {
    time: "9m ago",
    severity: "warn",
    label: "WARN",
    code: "QUEUE_RETRY_LIMIT",
    occurrences: "3 occurrences",
  },
  {
    time: "21m ago",
    severity: "info",
    label: "INFO",
    code: "AUTH_TOKEN_REFRESHED",
    occurrences: "12 occurrences",
  },
];

const SEVERITY_TONE: Record<Severity, { bg: string; border: string; text: string }> = {
  error: {
    bg: "color-mix(in oklab, var(--status-danger) 14%, transparent)",
    border: "color-mix(in oklab, var(--status-danger) 32%, transparent)",
    text: "var(--status-danger)",
  },
  warn: {
    bg: "color-mix(in oklab, var(--status-warning) 14%, transparent)",
    border: "color-mix(in oklab, var(--status-warning) 32%, transparent)",
    text: "var(--status-warning)",
  },
  info: {
    bg: "color-mix(in oklab, var(--brand-primary) 14%, transparent)",
    border: "color-mix(in oklab, var(--brand-primary) 32%, transparent)",
    text: "var(--brand-primary)",
  },
};

export function ErrorsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 overflow-hidden rounded-md bg-[var(--neutral-2)] px-3 py-2"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between text-[10px] text-[var(--neutral-11)]">
        <span className="flex items-center gap-1 font-medium text-[var(--neutral-12)]">
          <Cross className="h-3 w-3" aria-hidden />
          Recent errors
        </span>
        <span className="font-mono tabular-nums">3</span>
      </div>

      <div className="flex flex-col gap-1">
        {ROWS.map((row) => {
          const tone = SEVERITY_TONE[row.severity];
          return (
            <div
              key={row.code}
              className="flex items-center justify-between gap-2 rounded-sm border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-mono text-[9px] text-[var(--neutral-10)] tabular-nums">
                  {row.time}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 rounded-sm px-1.5 text-[9px] font-semibold leading-none"
                  style={{
                    background: tone.bg,
                    borderColor: tone.border,
                    color: tone.text,
                  }}
                >
                  {row.label}
                </Badge>
                <code className="truncate font-mono text-[9px] text-[var(--neutral-12)]">
                  {row.code}
                </code>
              </div>
              <span className="shrink-0 font-mono text-[9px] text-[var(--neutral-11)]">
                {row.occurrences}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col justify-end gap-0.5 rounded-sm border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1">
        <code className="truncate font-mono text-[9px] text-[var(--neutral-11)]">
          at packages/commerce/billing/src/charge.ts:42
        </code>
        <code className="truncate font-mono text-[9px] text-[var(--neutral-11)]">
          at @nebutra/queue: retryHandler
        </code>
      </div>

      <div className="flex items-center gap-1 text-[9px] text-[var(--neutral-10)]">
        <Bug className="h-2.5 w-2.5" aria-hidden />
        <span className="font-mono">Sentry · structured logs</span>
      </div>
    </div>
  );
}
