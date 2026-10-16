import { CheckCircleFill, CrossCircleFill, Information, WarningFill, Wrench } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import type { DayState } from "@/lib/view";
import { stateInk } from "./state-style";

export function StateIcon({ state, className }: { state: DayState; className?: string }) {
  const ink = cn(stateInk[state], className);
  if (state === "operational") return <CheckCircleFill aria-hidden className={ink} />;
  if (state === "outage") return <CrossCircleFill aria-hidden className={ink} />;
  if (state === "maintenance") return <Wrench aria-hidden className={ink} />;
  if (state === "degraded") return <WarningFill aria-hidden className={ink} />;
  return <Information aria-hidden className={ink} />;
}
