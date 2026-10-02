/**
 * Suspended-model retry backstop (ADR 2026-09-30 supply capability probing;
 * narrowed by the "Event-driven execution" addendum): every SUSPENDED model
 * whose backoff has elapsed (1h → 6h → 24h, see `@nebutra/router-supply`
 * `state.ts`) gets one more probe. Router's `probe.suspended` action lists the
 * due rows (one bounded, capped DB read, `listSuspendedDueForRetry` already
 * filters to `nextProbeAt <= now`) and emits `supply/probe.requested` grouped
 * by source — `supplyModelFanout` does the actual probing, one durable step
 * per model. Runs hourly, but most ticks find nothing due — the row-level
 * backoff is the real rate limiter, not this cron's interval.
 */

import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction } from "./lib/supply-admin-client.js";

export const supplySuspendedRetry: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-suspended-retry",
    name: "Supply Suspended Retry (backoff-gated)",
    concurrency: { limit: 1 },
    triggers: [{ cron: "15 * * * *" }],
  },
  async ({ step }) => {
    return step.run("probe.suspended", () => callSupplyAction("probe.suspended"));
  },
);
