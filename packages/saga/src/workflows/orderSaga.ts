import type { EventBus } from "@nebutra/event-bus";
import { createSaga, type SagaStep } from "../orchestrator";

export interface OrderContext {
  orderId: string;
  userId: string;
  tenantId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  // Step results
  inventoryReserved?: boolean;
  paymentId?: string;
  orderRecordId?: string;
  emailSent?: boolean;
}

/**
 * Reserve inventory step
 */
const reserveInventory: SagaStep<OrderContext> = {
  name: "reserve_inventory",
  async execute(ctx) {
    // TODO: Call ecommerce service to reserve inventory
    return { ...ctx, inventoryReserved: true };
  },
  async compensate(_ctx) {
    // TODO: Call ecommerce service to release inventory
  },
};

/**
 * Charge payment step
 */
const chargePayment: SagaStep<OrderContext> = {
  name: "charge_payment",
  async execute(ctx) {
    // TODO: Call Stripe to charge payment
    return { ...ctx, paymentId: `pay_${Date.now()}` };
  },
  async compensate(ctx) {
    if (ctx.paymentId) {
      // TODO: Call Stripe to refund
    }
  },
};

/**
 * Create order record step
 */
const createOrderRecord: SagaStep<OrderContext> = {
  name: "create_order_record",
  async execute(ctx) {
    // TODO: Create order in database via api-gateway
    return { ...ctx, orderRecordId: `rec_${Date.now()}` };
  },
  async compensate(ctx) {
    if (ctx.orderRecordId) {
      // TODO: Update order status to cancelled
    }
  },
};

/**
 * Send confirmation email step
 */
const sendConfirmationEmail: SagaStep<OrderContext> = {
  name: "send_confirmation_email",
  async execute(ctx) {
    // TODO: Send email via Resend
    return { ...ctx, emailSent: true };
  },
  // Email doesn't need compensation - we can send a cancellation email instead
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
