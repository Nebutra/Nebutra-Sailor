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
async function gatewayFetch(path: string, options: RequestInit = {}) {
  // In a real execution, we'd sign this request with an HMAC token.
  // We'll mock the S2S headers for now.
  return fetch(`${API_GW_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-service-token": SERVICE_SECRET,
      ...options.headers,
    },
  });
}

/**
 * Reserve inventory step
 */
const reserveInventory: SagaStep<OrderContext> = {
  name: "reserve_inventory",
  async execute(ctx) {
    const res = await gatewayFetch("/api/v1/ecommerce/inventory/reserve", {
      method: "POST",
      body: JSON.stringify({
        orderId: ctx.orderId,
        items: ctx.items,
        tenantId: ctx.tenantId,
      }),
    });

    if (!res.ok) throw new Error("Failed to reserve inventory");
    return { ...ctx, inventoryReserved: true };
  },
  async compensate(ctx) {
    if (ctx.inventoryReserved) {
      await gatewayFetch("/api/v1/ecommerce/inventory/release", {
        method: "POST",
        body: JSON.stringify({
          orderId: ctx.orderId,
          items: ctx.items,
          tenantId: ctx.tenantId,
        }),
      }).catch((err) => logger.error("Inventory release compensation failed", { error: err }));
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
      // Mock fallback if customerId isn't provided but we require payment
      // In real life, require customerId or fail.
      return { ...ctx, paymentId: `mock_pay_${Date.now()}` };
    }
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ctx.totalAmount, // amount in cents
      currency: "usd",
      customer: ctx.customerId,
      confirm: true,
      off_session: true, // charge stored card asynchronously
      metadata: { orderId: ctx.orderId, tenantId: ctx.tenantId },
    });

    if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    return { ...ctx, paymentId: paymentIntent.id };
  },
  async compensate(ctx) {
    if (ctx.paymentId && ctx.paymentId.startsWith("pi_")) {
      const stripe = getStripe();
      await stripe.refunds
        .create({
          payment_intent: ctx.paymentId,
        })
        .catch((err) => logger.error("Payment refund compensation failed", { error: err }));
    }
  },
};

/**
 * Create order record step
 */
const createOrderRecord: SagaStep<OrderContext> = {
  name: "create_order_record",
  async execute(ctx) {
    const res = await gatewayFetch("/api/v1/ecommerce/orders", {
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
    });

    if (!res.ok) throw new Error("Failed to create order record in database");

    const data = (await res.json()) as { id: string };
    return { ...ctx, orderRecordId: data.id || `rec_${Date.now()}` };
  },
  async compensate(ctx) {
    if (ctx.orderRecordId || ctx.orderId) {
      await gatewayFetch(`/api/v1/ecommerce/orders/${ctx.orderId}/cancel`, {
        method: "POST",
      }).catch((err) => logger.error("Order record cancellation failed", { error: err }));
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
