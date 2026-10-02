/**
 * Supply model fan-out (ADR 2026-09-30, "Event-driven execution"): one
 * `step.run` per model, each calling Router's `probe.one` action (exactly one
 * upstream HTTP call, bounded, never looped inside one HTTP request). This is
 * the fix for the incident this ADR exists for — an 86-model "probe now" used
 * to be 86 sequential upstream calls inside one synchronous HTTP request and
 * hit a Cloudflare 524 at 100s; here each model is its own durable step with
 * its own retry/timeout, and the whole run can take as long as it needs.
 *
 * Triggered by two events:
 *   - `supply/model.discovered` — discovery already named the models; fan out
 *     directly over `upstreamModels`.
 *   - `supply/probe.requested` — admin "probe now" or a backstop sweep. When
 *     `upstreamModels` is given (the idle/suspended backstops group their due
 *     rows by source before emitting), fan out over exactly those. When it is
 *     omitted (a plain "probe this whole source now"), discover first, then
 *     list every current, non-vanished model for the source
 *     (`listSupplyCapabilities` — Router's existing read-only `capabilities`
 *     resource, one bounded DB-backed GET) and fan out over that.
 *
 * Concurrency is capped per source (respects that source's own rate limits /
 * quota headroom — a source already near its cap doesn't get N probes fired
 * at once) and overall (a second, unkeyed ceiling so no single giant source
 * can still saturate the whole fan-out worker pool).
 *
 * Image probes: `listSupplyCapabilities` reports each row's `modality`. A
 * fixed, extra pause before an image-modality step is the function's own
 * throttle for the one modality this ADR's quota addendum already classifies
 * as unusually expensive (`verify.ts`'s image probe is a real image
 * generation call, not a `max_tokens: 1` no-op) — stated scope limit, not a
 * per-source rate: it does not read the source's own quota headroom (that
 * would need a quota-window lookup per model here, which this fan-out
 * deliberately keeps out of — a throttled source's probe failing 429 is
 * already a neutral outcome, see `classifyFailure`/`isNeutralFailureReason`).
 */

import {
  SupplyModelDiscoveredDataSchema,
  SupplyProbeRequestedDataSchema,
} from "@nebutra/event-bus";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction, listSupplyCapabilities } from "./lib/supply-admin-client.js";

const IMAGE_PROBE_SPACING = "2s";

export interface SupplyModelFanoutStepTools {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleep(id: string, duration: string): Promise<unknown>;
}

interface FanoutEvent {
  name: "supply/model.discovered" | "supply/probe.requested";
  data: {
    sourceKey?: string;
    upstreamModels?: string[];
    runId?: string;
  };
}

/** Exported standalone so tests can drive it with a plain mocked `step`. */
export async function handleSupplyModelFanout({
  event,
  step,
}: {
  event: FanoutEvent;
  step: SupplyModelFanoutStepTools;
}): Promise<{ sourceKey: string; probed: number }> {
  const sourceKey = event.data.sourceKey;
  if (!sourceKey) return { sourceKey: "", probed: 0 };

  let targets: Array<{ upstreamModel: string; modality: string }>;

  if (event.data.upstreamModels && event.data.upstreamModels.length > 0) {
    targets = event.data.upstreamModels.map((upstreamModel) => ({ upstreamModel, modality: "" }));
  } else {
    // "Probe this whole source now" with no explicit model list: refresh
    // discovery first (one bounded call), then read back the current,
    // non-vanished model list (one bounded DB read) to fan out over.
    await step.run("discover-source", () =>
      callSupplyAction("source.discover", { key: sourceKey }),
    );
    const items = await step.run("list-models", () => listSupplyCapabilities(sourceKey));
    targets = items
      .filter((item) => item.vanishedAt === null)
      .map((item) => ({ upstreamModel: item.upstreamModel, modality: item.modality }));
  }

  let imageCount = 0;
  for (const target of targets) {
    if (target.modality.toUpperCase() === "IMAGE") {
      imageCount += 1;
      if (imageCount > 1) {
        await step.sleep(`image-throttle-${sourceKey}-${imageCount}`, IMAGE_PROBE_SPACING);
      }
    }
    await step.run(`probe-${sourceKey}-${target.upstreamModel}`, () =>
      callSupplyAction("probe.one", { key: sourceKey, upstreamModel: target.upstreamModel }),
    );
  }

  return { sourceKey, probed: targets.length };
}

export const supplyModelFanout: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-model-fanout",
    name: "Supply Model Fan-out (one probe per model)",
    // Per-source concurrency keeps one source's probes from racing its own
    // rate limit; the second, unkeyed limit is the overall ceiling.
    concurrency: [{ limit: 5, key: "event.data.sourceKey" }, { limit: 20 }],
    retries: 2,
    triggers: [
      { event: eventType("supply/model.discovered", { schema: SupplyModelDiscoveredDataSchema }) },
      { event: eventType("supply/probe.requested", { schema: SupplyProbeRequestedDataSchema }) },
    ],
  },
  handleSupplyModelFanout as never,
);
