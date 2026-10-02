/**
 * Idle verification backstop (ADR 2026-09-30 supply capability probing;
 * narrowed by the "Event-driven execution" addendum). Router's `probe.idle`
 * action no longer probes inline — it lists AVAILABLE/DEGRADED models nobody
 * has probed in 24h (one bounded, capped DB read), groups them by source, and
 * emits one `supply/probe.requested` per source; `supplyModelFanout` does the
 * actual one-upstream-call-per-model work as durable steps. Passive signals
 * from real traffic (`apps/router/src/lib/openai-edge.ts`) already cover busy
 * models and trigger their own targeted re-probe (`supply/model.signal`) —
 * this sweep is what still catches a model with no recent traffic to observe
 * passively.
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
