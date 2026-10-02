/**
 * Supply source changed (ADR 2026-09-30, "Event-driven execution"): a source
 * was added, its credential changed, it was (re)enabled, or the daily
 * discovery backstop is sweeping it. Runs discovery for exactly *one* source
 * (Router's `source.discover` action — one or two HTTP calls to that source's
 * own enumeration endpoint, never a loop over every model) and, when that
 * turns up models that are new or came back, hands them to
 * `supplyModelFanout` as a `supply/model.discovered` event instead of probing
 * them here.
 */

import { SupplySourceChangedDataSchema } from "@nebutra/event-bus";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction } from "./lib/supply-admin-client.js";

export interface SupplySourceChangedStepTools {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sendEvent(id: string, payload: { name: string; data: Record<string, unknown> }): Promise<unknown>;
}

interface DiscoverDiffBody {
  readonly ok?: boolean;
  readonly added?: string[];
  readonly reappeared?: string[];
  readonly note?: string;
}

/** Exported standalone so tests can drive it with a plain mocked `step`, with no Inngest runtime involved. */
export async function handleSupplySourceChanged({
  event,
  step,
}: {
  event: { data: { sourceKey: string; reason: string } };
  step: SupplySourceChangedStepTools;
}): Promise<{ sourceKey: string; fresh: number }> {
  const { sourceKey } = event.data;

  const result = await step.run("discover-source", () =>
    callSupplyAction("source.discover", { key: sourceKey }),
  );
  const body = (result as { body?: DiscoverDiffBody }).body ?? {};
  const fresh = [...(body.added ?? []), ...(body.reappeared ?? [])];

  if (fresh.length > 0) {
    await step.sendEvent("model-discovered", {
      name: "supply/model.discovered",
      data: { sourceKey, upstreamModels: fresh },
    });
  }

  return { sourceKey, fresh: fresh.length };
}

export const supplySourceChanged: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-source-changed",
    name: "Supply Source Changed (discover one source)",
    // One in-flight discovery per source at a time; several different
    // sources can still discover concurrently.
    concurrency: { limit: 1, key: "event.data.sourceKey" },
    retries: 3,
    triggers: [
      { event: eventType("supply/source.changed", { schema: SupplySourceChangedDataSchema }) },
    ],
  },
  handleSupplySourceChanged as never,
);
