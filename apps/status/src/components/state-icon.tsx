import { CheckCircleFill, CrossCircleFill, WarningFill, Wrench } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import type { DayState } from "@/lib/view";
import { stateInk } from "./state-style";

/** Icons mark trouble only: operational and silent rows carry none (see `force`). */
export function StateIcon({
  state,
  className,
  force = false,
}: {
  state: DayState;
  className?: string;
  /** Draw the operational check too — the verdict card uses it. */
  force?: boolean;
}) {
  const ink = cn("shrink-0", stateInk[state], className);
  if (state === "operational")
    return force ? <CheckCircleFill aria-hidden className={ink} /> : null;
  if (state === "outage") return <CrossCircleFill aria-hidden className={ink} />;
  if (state === "maintenance") return <Wrench aria-hidden className={ink} />;
  if (state === "degraded") return <WarningFill aria-hidden className={ink} />;
  return null;
}
