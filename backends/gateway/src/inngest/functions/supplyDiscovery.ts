/**
 * Daily discovery backstop across every enabled supply source (ADR 2026-09-30
 * supply capability probing; narrowed to a backstop by the "Event-driven
 * execution" addendum). Router's `discovery.run` action does no discovery
 * itself any more — it lists enabled sources (one bounded DB read) and emits
 * one `supply/source.changed` per source, which `supplySourceChanged` then
 * discovers and fans out from. This cron exists only to catch a source whose
 * event-driven trigger never fired (a credential rotated without going
 * through the admin flow, a missed event) — most days, every source has
 * already been (re)discovered well before this runs.
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
