/**
 * Supply bootstrap (ADR 2026-09-30, "Event-driven execution"): a freshly
 * deployed environment whose supply registry has never been seeded gets its
 * built-in sources discovered without anyone having to ssh in and probe by
 * hand (the exact operational gap the ADR calls out: "newly deployed systems
 * wait until the 03:00 cron").
 *
 * Router emits `supply/bootstrap` at most once per process
 * (`apps/router/src/instrumentation.ts` → `maybeEmitBootstrap`), naming the
 * built-in source keys that still need seeding. "Bootstrap = source.changed
 * for every built-in source" (the ADR's own words): this function does
 * nothing but fan that one event into one `supply/source.changed` per key,
 * reusing `supplySourceChanged`'s discovery + fan-out rather than
 * duplicating it.
 */

import { SupplyBootstrapDataSchema } from "@nebutra/event-bus";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";

export interface SupplyBootstrapStepTools {
  sendEvent(
    id: string,
    payload:
      | { name: string; data: Record<string, unknown> }
      | Array<{ name: string; data: Record<string, unknown> }>,
  ): Promise<unknown>;
}

interface BootstrapEvent {
  data: { sourceKeys: string[] };
}

/** Exported standalone so tests can drive it with a plain mocked `step`. */
export async function handleSupplyBootstrap({
  event,
  step,
}: {
  event: BootstrapEvent;
  step: SupplyBootstrapStepTools;
}): Promise<{ sources: number }> {
  const keys = event.data.sourceKeys ?? [];
  if (keys.length === 0) return { sources: 0 };

  await step.sendEvent(
    "seed-sources",
    keys.map((sourceKey) => ({
      name: "supply/source.changed",
      data: { sourceKey, reason: "enabled" as const },
    })),
  );

  return { sources: keys.length };
}

export const supplyBootstrap: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-bootstrap",
    name: "Supply Bootstrap (seed built-in sources once)",
    retries: 3,
    triggers: [{ event: eventType("supply/bootstrap", { schema: SupplyBootstrapDataSchema }) }],
  },
  handleSupplyBootstrap as never,
);
