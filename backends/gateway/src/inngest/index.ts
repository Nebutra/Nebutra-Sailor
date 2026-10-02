import type { InngestFunction } from "inngest";
import { serve } from "inngest/hono";
import { inngest } from "./client.js";
import { automationRunner } from "./functions/automationRunner.js";
import { automationScheduler } from "./functions/automationScheduler.js";
import { processBillingEvent } from "./functions/billingSync.js";
import { processGdprDeletion } from "./functions/gdprDeletion.js";
import { paymentOrderReconcile } from "./functions/paymentOrderReconcile.js";
import { pebbleDiagnosticsRetention } from "./functions/pebbleDiagnosticsRetention.js";
import { requestLogRetention } from "./functions/requestLogRetention.js";
import { routerReservationSweep } from "./functions/routerReservationSweep.js";
import { supplyBootstrap } from "./functions/supplyBootstrap.js";
import { supplyDiscovery } from "./functions/supplyDiscovery.js";
import { supplyModelFanout } from "./functions/supplyModelFanout.js";
import { supplyModelSignal } from "./functions/supplyModelSignal.js";
import { supplyQuotaPull } from "./functions/supplyQuotaPull.js";
import { supplySourceChanged } from "./functions/supplySourceChanged.js";
import { supplySuspendedRetry } from "./functions/supplySuspendedRetry.js";
import { supplyIdleVerification } from "./functions/supplyVerification.js";
import { walletUpkeep } from "./functions/walletUpkeep.js";
import { workflowRunner } from "./functions/workflowRunner.js";

export const inngestFunctions: InngestFunction.Any[] = [
  processBillingEvent,
  processGdprDeletion,
  automationScheduler,
  automationRunner,
  workflowRunner,
  pebbleDiagnosticsRetention,
  routerReservationSweep,
  requestLogRetention,
  paymentOrderReconcile,
  walletUpkeep,
  // Supply capability probing — cron backstops (narrowed to emit events, not
  // to loop over every model themselves; see each function's doc comment).
  supplyDiscovery,
  supplyIdleVerification,
  supplySuspendedRetry,
  supplyQuotaPull,
  // Supply capability probing — event-driven execution (ADR 2026-09-30).
  supplySourceChanged,
  supplyModelFanout,
  supplyModelSignal,
  supplyBootstrap,
];
export { inngest };

/**
 * Hono-compatible request handler for the Inngest serve endpoint.
 *
 * Register it in backends/gateway/src/index.ts:
 *
 *   import { inngestHandler } from "./inngest/index.js";
 *   app.on(["GET", "POST", "PUT"], "/api/inngest", (c) => inngestHandler(c));
 */
export const inngestHandler = serve({
  client: inngest,
  functions: inngestFunctions,
});
