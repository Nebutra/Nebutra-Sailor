/**
 * Daily discovery diff across every enabled supply source (ADR 2026-09-30
 * supply capability probing) — new / vanished models, deferred to Router's
 * own `discovery.run` admin action (see `lib/supply-admin-client.ts` for why
 * this calls Router rather than re-implementing discovery here).
 */

import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { callSupplyAction } from "./lib/supply-admin-client.js";

export const supplyDiscovery: InngestFunction.Any = inngest.createFunction(
  {
    id: "supply-discovery",
    name: "Supply Discovery (daily diff)",
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {
    return step.run("discovery.run", () => callSupplyAction("discovery.run"));
  },
);
