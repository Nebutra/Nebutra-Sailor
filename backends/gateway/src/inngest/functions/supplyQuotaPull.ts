/**
 * Adaptive quota-usage pull (ADR 2026-09-30 addendum — quota layer, §6).
 * Every 15 minutes — the ceiling frequency, not the real one: the adaptive
 * part lives inside `quota.pull` itself
 * (`RouterSupplyRepository.listQuotaWindowsDueForPull`), which only acts on
 * windows whose own `nextPullAt` has elapsed. A window nearing its limit
 * schedules its own next pull soon; an idle one schedules it far out — most
 * 15-minute ticks should find few windows due, the same "row-level schedule
 * is the real rate limiter" posture `supplySuspendedRetry` already
 * established for capability.
 */

import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction } from "./lib/supply-admin-client.js";

export const supplyQuotaPull: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-quota-pull",
    name: "Supply Quota Pull (adaptive)",
    concurrency: { limit: 1 },
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    return step.run("quota.pull", () => callSupplyAction("quota.pull"));
  },
);
