import { Bell, Clock, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type RuleRow = {
  expression: string;
  status: "firing" | "warning" | "ok";
  label: string;
  channel: string;
};

const RULES: ReadonlyArray<RuleRow> = [
  {
    expression: "error.rate > 5%",
    status: "firing",
    label: "FIRING",
    channel: "→ Slack #ops",
  },
  {
    expression: "p95.latency > 800ms",
    status: "warning",
    label: "WARNING",
    channel: "→ PagerDuty",
  },
  {
    expression: "disk.usage > 80%",
    status: "ok",
    label: "OK",
    channel: "→ Email",
  },
];

const STATUS_TONE: Record<RuleRow["status"], { bg: string; border: string; text: string }> = {
  firing: {
    bg: "color-mix(in oklab, var(--status-danger) 14%, transparent)",
    border: "color-mix(in oklab, var(--status-danger) 32%, transparent)",
    text: "var(--status-danger)",
  },
  warning: {
    bg: "color-mix(in oklab, var(--status-warning) 14%, transparent)",
    border: "color-mix(in oklab, var(--status-warning) 32%, transparent)",
    text: "var(--status-warning)",
  },
  ok: {
    bg: "color-mix(in oklab, var(--status-success) 14%, transparent)",
    border: "color-mix(in oklab, var(--status-success) 32%, transparent)",
    text: "var(--status-success)",
  },
};

export function AlertingGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 overflow-hidden rounded-md bg-[var(--neutral-2)] px-3 py-2"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between text-[10px] text-[var(--neutral-11)]">
        <span className="flex items-center gap-1 font-medium text-[var(--neutral-12)]">
          <Bell className="h-3 w-3" aria-hidden />
          Active rules
        </span>
        <span className="font-mono tabular-nums">3</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {RULES.map((rule) => {
          const tone = STATUS_TONE[rule.status];
          return (
            <div
              key={rule.expression}
              className="flex items-center justify-between gap-2 rounded-sm border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Lightning className="h-3 w-3 shrink-0" style={{ color: tone.text }} aria-hidden />
                <code className="truncate font-mono text-[10px] text-[var(--neutral-12)]">
                  {rule.expression}
                </code>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="h-4 rounded-sm px-1.5 text-[9px] font-semibold leading-none"
                  style={{
                    background: tone.bg,
                    borderColor: tone.border,
                    color: tone.text,
                  }}
                >
                  {rule.label}
                </Badge>
                <span className="font-mono text-[9px] text-[var(--neutral-11)]">
                  {rule.channel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] text-[var(--neutral-10)]">
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" aria-hidden />
          evaluated every 30s
        </span>
        <span>webhook delivery</span>
      </div>
    </div>
  );
}
