import { Inngest } from "inngest";

/**
 * Type-safe Inngest client for the API Gateway.
 *
 * Inngest v4 supports Standard Schema natively — Zod v4 schemas are accepted
 * without any adapter layer. Event data is fully typed in function handlers.
 *
 * The SDK automatically reads:
 *   INNGEST_EVENT_KEY   – used when sending events to Inngest Cloud
 *   INNGEST_SIGNING_KEY – used to verify webhook signatures from Inngest Cloud
 */
export const inngest = new Inngest({
  id: "nebutra-api-gateway",
});
