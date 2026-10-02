/**
 * Supply model signal (ADR 2026-09-30, "Event-driven execution"): a passive
 * error-spike / rate-limit / quota-threshold signal from real traffic
 * (`apps/router/src/lib/supply/capability.ts` `recordPassiveSignal`,
 * `apps/router/src/lib/supply/quota.ts`'s `fireAlerts`) asks for a targeted
 * re-probe instead of waiting for the next idle/suspended backstop sweep.
 *
 * Debounced per `(sourceKey, upstreamModel)`: a burst of failing requests
 * against the same model fires this event many times in a few seconds, and
 * debounce collapses that burst into exactly one re-probe, scheduled `period`
 * after the *last* one in the burst — "retry a model nobody has stopped
 * calling" should not mean "retry it once per failed request."
 *
 * `quota_threshold` is deliberately a no-op here: a quota window crossing a
 * ratio rung is not a capability problem (the existing `fireAlerts` /
 * `notifyOpsAlert` path already pages the operator for that), so re-probing
 * the model would just waste another call against a source that is already
 * known to be busy, not broken — stated scope choice, not an oversight.
 */

import { SupplyModelSignalDataSchema } from "@nebutra/event-bus";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";

export interface SupplyModelSignalStepTools {
  sendEvent(id: string, payload: { name: string; data: Record<string, unknown> }): Promise<unknown>;
}

interface SignalEvent {
  data: {
    sourceKey: string;
    upstreamModel?: string;
    kind: "error_spike" | "rate_limited" | "quota_threshold";
    reason?: string;
  };
}

/** Exported standalone so tests can drive it with a plain mocked `step`. */
export async function handleSupplyModelSignal({
  event,
  step,
}: {
  event: SignalEvent;
  step: SupplyModelSignalStepTools;
}): Promise<{ requested: boolean }> {
  const { sourceKey, upstreamModel, kind } = event.data;

  if (kind === "quota_threshold" || !upstreamModel) {
    return { requested: false };
  }

  await step.sendEvent("targeted-reprobe", {
    name: "supply/probe.requested",
    data: {
      sourceKey,
      upstreamModels: [upstreamModel],
      runId: `signal-${sourceKey}-${upstreamModel}-${Date.now()}`,
    },
  });

  return { requested: true };
}

export const supplyModelSignal: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-model-signal",
    name: "Supply Model Signal (debounced targeted re-probe)",
    debounce: {
      key: "event.data.sourceKey + '-' + (event.data.upstreamModel ?? 'source')",
      period: "2m",
      // A source that never stops erroring must still eventually get a
      // re-probe rather than having its debounce extended forever.
      timeout: "10m",
    },
    triggers: [
      { event: eventType("supply/model.signal", { schema: SupplyModelSignalDataSchema }) },
    ],
  },
  handleSupplyModelSignal as never,
);
