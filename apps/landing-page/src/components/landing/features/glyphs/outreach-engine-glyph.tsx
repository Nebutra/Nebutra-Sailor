import { Check, Clock, Envelope, Users } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type StepState = "done" | "current" | "pending";

type Step = {
  label: { en: string; zh: string };
  state: StepState;
};

const STEPS: Step[] = [
  { label: { en: "Day 1: intro", zh: "第 1 天 · 自我介绍" }, state: "done" },
  { label: { en: "Day 3: case study", zh: "第 3 天 · 案例" }, state: "done" },
  { label: { en: "Day 7: demo offer", zh: "第 7 天 · 邀约 Demo" }, state: "current" },
  { label: { en: "Day 14: bump", zh: "第 14 天 · 跟进" }, state: "pending" },
];

const STEP_STYLES: Record<StepState, string> = {
  done: "border-[color:var(--status-success)]/30 bg-[color:var(--status-success)]/10 text-[color:var(--status-success)]",
  current:
    "border-[color:var(--status-warning)]/40 bg-[color:var(--status-warning)]/10 text-[color:var(--status-warning)]",
  pending: "border-neutral-7 bg-transparent text-neutral-11",
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <Check className="h-3 w-3" />;
  if (state === "current") return <Clock className="h-3 w-3" />;
  return <span className="block h-1.5 w-1.5 rounded-full border border-current" aria-hidden />;
}

export function OutreachEngineGlyph({ locale }: SubpackageGlyphProps) {
  const campaignName = locale === "zh" ? "Q4 企业级外联" : "Q4 enterprise outbound";
  const statusText = locale === "zh" ? "运行中 · 47 位潜在客户" : "Active · 47 prospects";
  const sentLabel = locale === "zh" ? "已发" : "Sent";
  const openLabel = locale === "zh" ? "打开" : "Opens";
  const replyLabel = locale === "zh" ? "回复" : "Replies";

  return (
    <div
      className="flex w-full flex-col gap-2.5 rounded-md bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Envelope className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate font-mono text-[11px] text-neutral-12">{campaignName}</span>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 gap-1 border-[color:var(--status-success)]/30 bg-[color:var(--status-success)]/10 px-1.5 py-0 text-[10px] font-normal text-[color:var(--status-success)]"
        >
          <span
            className="block h-1.5 w-1.5 rounded-full bg-[color:var(--status-success)]"
            aria-hidden
          />
          <Users className="h-2.5 w-2.5" />
          <span>{statusText}</span>
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((step) => (
          <div
            key={step.label.en}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${STEP_STYLES[step.state]}`}
          >
            <StepIcon state={step.state} />
            <span className="font-mono">{step.label[locale]}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-11">
          <span>
            {sentLabel} <span className="text-neutral-12">· 247</span>
          </span>
          <span className="text-neutral-7">/</span>
          <span>
            {openLabel} <span className="text-neutral-12">· 38%</span>
          </span>
          <span className="text-neutral-7">/</span>
          <span>
            {replyLabel} <span className="text-neutral-12">· 12%</span>
          </span>
        </div>
        <div className="font-mono text-[10px] text-neutral-11">Apollo · LinkedIn · email</div>
      </div>
    </div>
  );
}
