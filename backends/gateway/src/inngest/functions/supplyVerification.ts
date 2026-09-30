/**
 * Idle verification (ADR 2026-09-30 supply capability probing): active-probe
 * every AVAILABLE/DEGRADED model nobody has probed in 24h. Passive signals
 * from real traffic (recorded in `apps/router/src/lib/openai-edge.ts`) cover
 * the busy models for free; this sweep is what still catches a model that
 * simply has no recent traffic to observe passively.
 */

import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction } from "./lib/supply-admin-client.js";

export const supplyIdleVerification: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-idle-verification",
    name: "Supply Idle Verification (24h)",
    concurrency: { limit: 1 },
    triggers: [{ cron: "30 3 * * *" }],
  },
  async ({ step }) => {
    return step.run("probe.idle", () => callSupplyAction("probe.idle"));
  },
);
