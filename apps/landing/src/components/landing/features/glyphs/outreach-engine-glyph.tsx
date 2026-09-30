import { Check, Clock, Envelope, Users } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type StepState = "done" | "current" | "pending";

type Step = {
  label: string;
  state: StepState;
};

const STEP_STATES: readonly StepState[] = ["done", "done", "current", "pending"];

type OutreachEngineCopy = {
  campaign: string;
  status: string;
  sent: string;
  open: string;
  reply: string;
  steps: Record<string, string>;
};

const STEP_STYLES: Record<StepState, string> = {
  done: "border-success/30 bg-success/10 text-success-strong",
  current: "border-warning/40 bg-warning/10 text-warning-strong",
  pending: "border-neutral-7 bg-transparent text-neutral-11",
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <Check className="h-3 w-3" />;
  if (state === "current") return <Clock className="h-3 w-3" />;
  return <span className="block h-1.5 w-1.5 rounded-full border border-current" aria-hidden />;
}

export function OutreachEngineGlyph({ copy }: SubpackageGlyphProps) {
  const t = copy as OutreachEngineCopy;
  const campaignName = t.campaign;
  const statusText = t.status;
  const sentLabel = t.sent;
  const openLabel = t.open;
  const replyLabel = t.reply;
  const steps: Step[] = STEP_STATES.map((state, i) => ({ state, label: t.steps[String(i)] }));

  return (
    <div
      className="flex w-full flex-col gap-2.5 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Envelope className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-mono text-[11px] text-neutral-12">{campaignName}</span>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 gap-1 border-success/30 bg-success/10 px-1.5 py-0 text-[10px] font-normal text-success-strong"
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          <Users className="h-2.5 w-2.5" />
          <span>{statusText}</span>
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${STEP_STYLES[step.state]}`}
          >
            <StepIcon state={step.state} />
            <span className="font-mono">{step.label}</span>
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
