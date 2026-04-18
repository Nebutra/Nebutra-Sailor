import { signServiceToken } from "@nebutra/auth";
import { getStripe } from "@nebutra/billing";
import { sendOrderConfirmationEmail } from "@nebutra/email";
import type { EventBus } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { createSaga, type SagaStep } from "../orchestrator";

export interface OrderContext {
  orderId: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  customerId?: string; // Stripe customer ID
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;

  // Step results
  inventoryReserved?: boolean;
  paymentId?: string;
  orderRecordId?: string;
  emailSent?: boolean;
}

const API_GW_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3002";
const SERVICE_SECRET = process.env.SERVICE_SECRET || "";

/**
 * Helper to make S2S authenticated requests to api-gateway
 */
async function gatewayFetch(
  path: string,
  options: RequestInit = {},
  ctx?: { tenantId: string; userId?: string },
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  let serviceToken = SERVICE_SECRET;
  if (ctx) {
    serviceToken = signServiceToken(
      { organizationId: ctx.tenantId, userId: ctx.userId },
      SERVICE_SECRET,
    );
    if (ctx.userId) headers["x-user-id"] = ctx.userId;
    headers["x-organization-id"] = ctx.tenantId;
  }
  headers["x-service-token"] = serviceToken;

  return fetch(`${API_GW_URL}${path}`, {
    ...options,
    headers,
  });
}

/**
 * Reserve inventory step
 */
const reserveInventory: SagaStep<OrderContext> = {
  name: "reserve_inventory",
  async execute(ctx) {
    const res = await gatewayFetch(
      "/api/v1/ecommerce/inventory/reserve",
      {
        method: "POST",
        body: JSON.stringify({
          orderId: ctx.orderId,
          items: ctx.items,
          tenantId: ctx.tenantId,
        }),
      },
      ctx,
    );

    if (!res.ok) throw new Error("Failed to reserve inventory");
    return { ...ctx, inventoryReserved: true };
  },
  async compensate(ctx) {
    if (ctx.inventoryReserved) {
      await gatewayFetch(
        "/api/v1/ecommerce/inventory/release",
        {
          method: "POST",
          body: JSON.stringify({
            orderId: ctx.orderId,
            items: ctx.items,
            tenantId: ctx.tenantId,
          }),
        },
        ctx,
      ).catch((err) => logger.error("Inventory release compensation failed", { error: err }));
    }
  },
};

/**
 * Charge payment step
 */
const chargePayment: SagaStep<OrderContext> = {
  name: "charge_payment",
  async execute(ctx) {
    if (!ctx.customerId) {
      throw new Error("Missing customerId for payment");
    }
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: ctx.totalAmount, // amount in cents
        currency: "usd",
        customer: ctx.customerId,
        confirm: true,
        off_session: true, // charge stored card asynchronously
        metadata: { orderId: ctx.orderId, tenantId: ctx.tenantId },
      },
      {
        idempotencyKey: `order:${ctx.orderId}:payment`,
      },
    );

    if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    return { ...ctx, paymentId: paymentIntent.id };
  },
  async compensate(ctx) {
    if (ctx.paymentId && ctx.paymentId.startsWith("pi_")) {
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: ctx.paymentId,
      });
    }
  },
};

/**
 * Create order record step
 */
const createOrderRecord: SagaStep<OrderContext> = {
  name: "create_order_record",
  async execute(ctx) {
    const res = await gatewayFetch(
      "/api/v1/ecommerce/orders",
      {
        method: "POST",
        body: JSON.stringify({
          orderId: ctx.orderId,
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          items: ctx.items,
          totalAmount: ctx.totalAmount,
          paymentId: ctx.paymentId,
          status: "confirmed",
        }),
      },
      ctx,
    );

    if (!res.ok) throw new Error("Failed to create order record in database");

    const data = (await res.json()) as { id: string };
    return { ...ctx, orderRecordId: data.id || `rec_${Date.now()}` };
  },
  async compensate(ctx) {
    if (ctx.orderRecordId || ctx.orderId) {
      await gatewayFetch(
        `/api/v1/ecommerce/orders/${ctx.orderId}/cancel`,
        {
          method: "POST",
        },
        ctx,
      ).catch((err) => logger.error("Order record cancellation failed", { error: err }));
    }
  },
};

/**
 * Send confirmation email step
 */
const sendConfirmationEmail: SagaStep<OrderContext> = {
  name: "send_confirmation_email",
  async execute(ctx) {
    if (ctx.userEmail) {
      await sendOrderConfirmationEmail({
        to: ctx.userEmail,
        orderId: ctx.orderId,
        totalAmount: ctx.totalAmount,
        items: ctx.items,
      });
    }
    return { ...ctx, emailSent: true };
  },
};

/**
 * Create and return the order saga
 */
export function createOrderSaga(eventBus: EventBus) {
  return createSaga<OrderContext>("ecommerce_order", eventBus)
    .addStep(reserveInventory)
    .addStep(chargePayment)
    .addStep(createOrderRecord)
    .addStep(sendConfirmationEmail);
}

/**
 * Execute an order saga
 */
export async function executeOrderSaga(
  order: Omit<OrderContext, "inventoryReserved" | "paymentId" | "orderRecordId" | "emailSent">,
  eventBus: EventBus,
) {
  const saga = createOrderSaga(eventBus);
  return saga.execute(order as OrderContext);
}
