/**
 * Suspended-model retry (ADR 2026-09-30 supply capability probing): every
 * SUSPENDED model whose backoff has elapsed (1h → 6h → 24h, see
 * `@nebutra/router-supply` `state.ts`) gets one more probe. Runs hourly, but
 * `RouterSupplyRepository.listSuspendedDueForRetry` filters to `nextProbeAt
 * <= now`, so most hourly ticks find nothing to do — the row-level backoff is
 * the real rate limiter, not this cron's interval.
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
