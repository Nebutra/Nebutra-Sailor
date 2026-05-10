import type { InngestFunction } from "inngest";
import { serve } from "inngest/hono";
import { inngest } from "./client.js";
import { processBillingEvent } from "./functions/billingSync.js";
import { processGdprDeletion } from "./functions/gdprDeletion.js";
import { provisionTenant } from "./functions/tenantProvisioning.js";
import { deleteUserFromDB, syncUserToDB } from "./functions/userSync.js";

export const inngestFunctions: InngestFunction.Any[] = [
  syncUserToDB,
  deleteUserFromDB,
  processBillingEvent,
  processGdprDeletion,
  provisionTenant,
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
