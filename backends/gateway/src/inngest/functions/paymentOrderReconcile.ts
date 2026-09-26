/**
 * Payment order reconcile.
 *
 * A wallet notification is one HTTP call from WeChat Pay or Alipay to us. When
 * it is lost — our edge was redeploying, the cross-border hop timed out, the
 * wallet gave up retrying — the buyer has paid and received nothing. This
 * asks the wallet directly about every order still pending two minutes after
 * it was created, settles the ones that were paid, expires the ones that ran
 * out, and retries fulfillment for any order paid but never handed over.
 *
 * Settling is idempotent (a conditional status update plus fulfillment keyed
 * on the order id), so a run racing a late webhook settles each order once.
 */

import { reconcilePaymentOrders } from "@nebutra/billing";
import { logger } from "@nebutra/logger";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";

/** Ceiling per run. Each pending wallet order costs one status query. */
const RECONCILE_BATCH = 100;

export const paymentOrderReconcile: InngestFunction.Any = inngest.createFunction(
  {
    id: "payment-order-reconcile",
    name: "Payment Order Reconcile",
    concurrency: { limit: 1 },
    // Every two minutes: a buyer staring at a QR code that already charged
    // them should not wait long. Idle runs cost one indexed query.
    triggers: [{ cron: "*/2 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("reconcile-orders", () =>
      reconcilePaymentOrders({ limit: RECONCILE_BATCH }),
    );

    if (result.settled > 0 || result.fulfilled > 0 || result.errors > 0) {
      logger.warn("Payment order reconcile recovered or failed orders", { ...result });
    }
    return result;
  },
);
