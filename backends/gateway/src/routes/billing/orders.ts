/**
 * /api/v1/billing — offers and payment orders
 *
 *   GET  /offers         — what can be bought (?product= narrows to one product)
 *   GET  /offers/methods — which payment methods are live right now
 *   POST /orders         — buy one offer; returns a QR code or a redirect
 *   GET  /orders/{id}    — poll an order (the QR page waits on this)
 *
 * The request names an offer and a way to pay. It never carries a price: the
 * server prices the offer from the catalog and locks it on the order.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  assertProductReturnUrl,
  BillingError,
  createPaymentOrder,
  getPaymentOrder,
  isPaymentMethodAvailable,
  listOffers,
  type PaymentMethod,
} from "@nebutra/billing";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";
import {
  requireAuth,
  requireBillingManage,
  requireOrganization,
} from "../../middlewares/tenantContext.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";

export const orderRoutes = new OpenAPIHono();

orderRoutes.use("/offers", requireAuth, requireOrganization);
orderRoutes.use("/offers/*", requireAuth, requireOrganization);
orderRoutes.use("/orders", requireAuth, requireOrganization, guardPurchase);
orderRoutes.use("/orders/*", requireAuth, requireOrganization);

const METHODS = ["card", "alipay", "wechat"] as const satisfies readonly PaymentMethod[];

/**
 * Buying spends the organization's money: billing managers only. Reading an
 * order (the QR page polls it) stays open to any member.
 */
async function guardPurchase(c: Context, next: Next) {
  if (c.req.method === "POST") return requireBillingManage(c, next);
  await next();
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string(), code: z.string().optional() });

const PerCurrency = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ USD: value.optional(), CNY: value.optional() });

const OfferSchema = z.object({
  id: z.string(),
  /** The product whose balance this offer feeds. */
  product: z.string(),
  name: z.string(),
  /** Fixed price, major units. Absent when the buyer names the amount. */
  prices: PerCurrency(z.number()).optional(),
  /** The range a buyer-named amount must fall in, major units. */
  customAmount: PerCurrency(z.object({ min: z.number(), max: z.number() })).optional(),
  highlight: z.string().optional(),
});

const OffersQuerySchema = z.object({
  product: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,31}$/)
    .optional(),
});

const MethodsSchema = z.object({
  methods: z.array(z.object({ id: z.enum(METHODS), currency: z.enum(["USD", "CNY"]) })),
});

const CreateOrderSchema = z.object({
  offerId: z.string().min(1),
  /** `card` → Creem (USD). `alipay` / `wechat` → the wallet (CNY). */
  method: z.enum(METHODS),
  /** Major units, for an offer with `customAmount`. The server checks the range and locks it. */
  amount: z.number().positive().optional(),
  /** Wallets only: `qr` on a desktop, `h5` on the buyer's own phone. */
  channel: z.enum(["qr", "h5"]).default("qr"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const CreatedOrderSchema = z.object({
  orderId: z.string(),
  /** `redirect`: send the browser to `url`. `qr`: render `url` as a QR code. */
  kind: z.enum(["redirect", "qr"]),
  url: z.string(),
  amountMinor: z.number().int(),
  currency: z.enum(["USD", "CNY"]),
});

const OrderStatusSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  status: z.enum(["PENDING", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "EXPIRED"]),
  /** True once what was bought has been handed over. */
  fulfilled: z.boolean(),
  amountMinor: z.number().int(),
  currency: z.string(),
  method: z.string(),
  createdAt: z.string(),
});

// ── GET /offers ───────────────────────────────────────────────────────────────

orderRoutes.openapi(
  createRoute({
    method: "get",
    path: "/offers",
    tags: ["Billing", "Orders"],
    summary: "List the offers that can be bought",
    request: { query: OffersQuerySchema },
    responses: {
      200: {
        description: "Active offers",
        content: { "application/json": { schema: z.object({ offers: z.array(OfferSchema) }) } },
      },
    },
  }),
  (c) =>
    c.json({
      offers: listOffers(c.req.valid("query").product).map(
        ({ id, product, name, prices, customAmount, highlight }) => ({
          id,
          product,
          name,
          ...(prices ? { prices } : {}),
          ...(customAmount ? { customAmount } : {}),
          ...(highlight ? { highlight } : {}),
        }),
      ),
    }),
);

orderRoutes.openapi(
  createRoute({
    method: "get",
    path: "/offers/methods",
    tags: ["Billing", "Orders"],
    summary: "List the payment methods that are live",
    description: "A method is live when its provider keys are configured.",
    responses: {
      200: {
        description: "Live payment methods",
        content: { "application/json": { schema: MethodsSchema } },
      },
    },
  }),
  (c) =>
    c.json({
      methods: METHODS.filter(isPaymentMethodAvailable).map((id) => ({
        id,
        currency: id === "card" ? ("USD" as const) : ("CNY" as const),
      })),
    }),
);

// ── POST /orders ──────────────────────────────────────────────────────────────

orderRoutes.openapi(
  createRoute({
    method: "post",
    path: "/orders",
    tags: ["Billing", "Orders"],
    summary: "Create a payment order for one offer",
    request: { body: { content: { "application/json": { schema: CreateOrderSchema } } } },
    responses: {
      200: {
        description: "Order created; send the buyer to the payment",
        content: { "application/json": { schema: CreatedOrderSchema } },
      },
      400: {
        description: "Unknown offer, unavailable method, or a return URL off the product origin",
        content: { "application/json": { schema: ErrorSchema } },
      },
      500: {
        description: "Payment provider error",
        content: { "application/json": { schema: ErrorSchema } },
      },
      503: {
        description: "Billing service temporarily unavailable",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const tenant = c.get("tenant");
    const organizationId = tenant.organizationId as string;
    const body = c.req.valid("json");

    try {
      const successUrl = assertProductReturnUrl(body.successUrl);
      const cancelUrl = assertProductReturnUrl(body.cancelUrl);
      const clientIp =
        c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim();

      const created = await billingServiceBreaker.call(() =>
        createPaymentOrder({
          organizationId,
          offerId: body.offerId,
          method: body.method,
          channel: body.channel,
          ...(body.amount === undefined ? {} : { amount: body.amount }),
          successUrl,
          cancelUrl,
          ...(clientIp ? { clientIp } : {}),
        }),
      );

      logger.info("Payment order created", {
        organizationId,
        orderId: created.orderId,
        offerId: body.offerId,
        method: body.method,
        amountMinor: created.amountMinor,
        currency: created.currency,
      });

      return c.json(
        {
          orderId: created.orderId,
          kind: created.session.kind,
          url: created.session.url,
          amountMinor: created.amountMinor,
          currency: created.currency,
        },
        200,
      );
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        return c.json({ error: "Billing service temporarily unavailable" }, 503);
      }
      if (err instanceof BillingError && err.statusCode === 400) {
        return c.json({ error: err.message, code: err.code }, 400);
      }
      logger.error("Payment order creation failed", err, { organizationId, offerId: body.offerId });
      return c.json({ error: "Payment provider error" }, 500);
    }
  },
);

// ── GET /orders/{id} ──────────────────────────────────────────────────────────

orderRoutes.openapi(
  createRoute({
    method: "get",
    path: "/orders/{id}",
    tags: ["Billing", "Orders"],
    summary: "Get a payment order's status",
    request: { params: z.object({ id: z.string().min(1) }) },
    responses: {
      200: {
        description: "Order status",
        content: { "application/json": { schema: OrderStatusSchema } },
      },
      404: {
        description: "No such order in this organization",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const tenant = c.get("tenant");
    const { id } = c.req.valid("param");
    const order = await getPaymentOrder(id);

    // Another organization's order is indistinguishable from a missing one.
    if (!order || order.tenantId !== tenant.organizationId) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json(
      {
        id: order.id,
        offerId: order.offerId,
        status: order.status,
        fulfilled: order.fulfilledAt !== null,
        amountMinor: order.amountMinor,
        currency: order.currency,
        method: order.method,
        createdAt: order.createdAt.toISOString(),
      },
      200,
    );
  },
);
