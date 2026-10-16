/**
 * /api/v1/billing — offers and payment orders
 *
 *   GET  /offers         — what can be bought (?product= narrows to one product)
 *   GET  /offers/methods — which payment methods are live right now
 *   POST /orders         — buy one offer; returns a QR code or a redirect
 *   GET  /orders         — the organization's orders across products (the account ledger)
 *   GET  /orders/{id}    — poll an order (the QR page waits on this)
 *
 * The request names an offer and a way to pay. It never carries a price: the
 * server prices the offer from the catalog and locks it on the order.
 *
 * Nor does it say whose account pays. The offer does (ADR 2026-09-27): a
 * Kuanlan pack is the buyer's own, a Para plan the active organization's, a
 * Router top-up the organization's when one is active. The server resolves the
 * paying tenant from the session and the offer, never from the request.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  assertProductReturnUrl,
  BillingError,
  createPaymentOrder,
  getCreemCheckout,
  getMembership,
  getOffer,
  getPaymentOrder,
  isPaymentMethodAvailable,
  listOffers,
  listPaymentOrders,
  type Offer,
  offerAccount,
  type PaymentMethod,
  settlePaymentOrder,
} from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { PersonalTenantRepository } from "@nebutra/repositories";
import type { Context, Next } from "hono";
import { requireAuth, requireBillingManage } from "../../middlewares/tenantContext.js";
import { billingServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";
import { resolveSelfServiceReadiness } from "./self-service.js";
import { browserSession } from "./session.js";

export const orderRoutes = new OpenAPIHono();

// What is for sale, and how it can be paid, is public: a product's pricing
// page renders before anyone signs in.
// The product app calls these from the browser with its session cookie
// (./session.ts); service tokens and Bearer JWTs resolve upstream as before.
orderRoutes.use("/orders", browserSession, requireAuth, guardPurchase);
orderRoutes.use("/orders/*", browserSession, requireAuth);
orderRoutes.use("/orders/:id/verify", guardVerify);
orderRoutes.use("/self-service", browserSession, requireAuth);

const METHODS = ["card", "alipay", "wechat"] as const satisfies readonly PaymentMethod[];

// AUDIT(no-tenant): the tenants table is what tenant scoping derives from;
// resolving (or provisioning) a buyer's own tenant has no tenant to scope to.
const personalTenants = () => new PersonalTenantRepository(getSystemDb());

type Payer = { kind: "organization" | "personal"; tenantId: string };

const GRANT_KEYS = ["credits", "tier", "days", "monthlyCredits", "expiresInDays"] as const;

/** The display-safe part of a fulfillment spec: what is granted, not how. */
function publicGrants(params: Record<string, unknown>) {
  const grants: Record<string, string | number> = {};
  for (const key of GRANT_KEYS) {
    const value = params[key];
    if (typeof value === "number" || typeof value === "string") grants[key] = value;
  }
  return grants;
}

/** An offer as a pricing page may show it: what it grants, never how. */
function publicOffer(offer: Offer) {
  return {
    id: offer.id,
    product: offer.product,
    account: offerAccount(offer),
    kind: offer.fulfillment.type,
    grants: publicGrants(offer.fulfillment.params),
    name: offer.name,
    ...(offer.prices ? { prices: offer.prices } : {}),
    ...(offer.customAmount ? { customAmount: offer.customAmount } : {}),
    ...(offer.highlight ? { highlight: offer.highlight } : {}),
  };
}

/**
 * Whose account an order is for. `organization` needs an active organization;
 * `workspace` falls back to the buyer's own account without one.
 */
async function resolvePayer(c: Context, offer: Offer): Promise<Payer | null> {
  const tenant = c.get("tenant");
  const account = offerAccount(offer);
  if (account !== "personal" && tenant.organizationId) {
    return { kind: "organization", tenantId: tenant.organizationId as string };
  }
  if (account === "organization") return null;
  return {
    kind: "personal",
    tenantId: await personalTenants().ensure({ userId: tenant.userId as string }),
  };
}

/** The tenants this session may read orders of: its organization and its own. */
async function readableTenants(c: Context): Promise<string[]> {
  const tenant = c.get("tenant");
  const own = await personalTenants().find(tenant.userId as string);
  return [tenant.organizationId as string | undefined, own ?? undefined].filter(
    (id): id is string => Boolean(id),
  );
}

/**
 * Buying for an organization spends its money: billing managers only. Buying
 * for yourself needs nobody's permission. Reading an order (the QR page polls
 * it) stays open to the buyer and the organization's members.
 */
/**
 * Settling a workspace order on return needs the same right as buying it.
 * A personal buyer has no workspace role; the handler still refuses any order
 * outside the buyer's own tenants.
 */
async function guardVerify(c: Context, next: Next) {
  if (!c.get("tenant")?.organizationId) return next();
  return requireBillingManage(c, next);
}

async function guardPurchase(c: Context, next: Next) {
  if (c.req.method !== "POST") return next();
  const body = (await c.req.json().catch(() => null)) as { offerId?: unknown } | null;
  const offer = typeof body?.offerId === "string" ? getOffer(body.offerId) : undefined;
  // An unknown offer is refused by the handler, with the reason.
  if (!offer) return next();
  const tenant = c.get("tenant");
  const account = offerAccount(offer);
  if (account === "personal" || (account === "workspace" && !tenant.organizationId)) {
    return next();
  }
  if (!tenant.organizationId) {
    return c.json({ error: "Forbidden", message: "Organization membership required" }, 403);
  }
  return requireBillingManage(c, next);
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string(), code: z.string().optional() });

const PerCurrency = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ USD: value.optional(), CNY: value.optional() });

const OfferSchema = z.object({
  id: z.string(),
  /** The product whose balance this offer feeds. */
  product: z.string(),
  /** Whose account it is bought for: the buyer's, the organization's, or whichever is active. */
  account: z.enum(["personal", "organization", "workspace"]),
  /** What it is: a credit pack, a membership period, or a money top-up. */
  kind: z.string(),
  /** What the buyer receives, for a pricing page to show. Never read by the payment path. */
  grants: z.object({
    credits: z.number().optional(),
    tier: z.string().optional(),
    days: z.number().optional(),
    monthlyCredits: z.number().optional(),
    expiresInDays: z.number().optional(),
  }),
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
  (c) => c.json({ offers: listOffers(c.req.valid("query").product).map(publicOffer) }),
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
    const body = c.req.valid("json");
    const offer = getOffer(body.offerId);
    if (!offer) {
      return c.json({ error: `Unknown offer: ${body.offerId}`, code: "OFFER_NOT_FOUND" }, 400);
    }
    const payer = await resolvePayer(c, offer);
    if (!payer) {
      return c.json(
        { error: "Organization membership required", code: "ORGANIZATION_REQUIRED" },
        400,
      );
    }
    const organizationId = payer.tenantId;

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

// ── GET /orders ───────────────────────────────────────────────────────────────

const OrderListItemSchema = OrderStatusSchema.extend({
  /** The product the order was locked to. */
  product: z.string().nullable(),
  /** The offer's current display name; the id when it has left the catalog. */
  name: z.string(),
});

orderRoutes.openapi(
  createRoute({
    method: "get",
    path: "/orders",
    tags: ["Billing", "Orders"],
    summary: "List this organization's orders, newest first",
    request: {
      query: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }),
    },
    responses: {
      200: {
        description: "Orders across every product",
        content: {
          "application/json": { schema: z.object({ orders: z.array(OrderListItemSchema) }) },
        },
      },
    },
  }),
  async (c) => {
    const { limit } = c.req.valid("query");
    const take = limit ?? 20;
    const lists = await Promise.all(
      (await readableTenants(c)).map((tenantId) => listPaymentOrders(tenantId, take)),
    );
    const orders = lists
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
    return c.json(
      {
        orders: orders.map((order) => ({
          id: order.id,
          offerId: order.offerId,
          product: order.product,
          name: getOffer(order.offerId)?.name ?? order.offerId,
          status: order.status,
          fulfilled: order.fulfilledAt !== null,
          amountMinor: order.amountMinor,
          currency: order.currency,
          method: order.method,
          createdAt: order.createdAt.toISOString(),
        })),
      },
      200,
    );
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
    const { id } = c.req.valid("param");
    const order = await getPaymentOrder(id);

    // Someone else's order is indistinguishable from a missing one.
    if (!order || !(await readableTenants(c)).includes(order.tenantId)) {
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

// ── GET /self-service ─────────────────────────────────────────────────────────
// Everything the product app's /billing page renders, in one read: the rail the
// checkout factory picked and what to set when nothing can take money, the
// live methods, the buyer's current plan (their membership of the product) and
// what can be bought. Buying itself stays POST /orders.

const SelfServiceSchema = z.object({
  provider: z.string(),
  status: z.enum(["disabled", "degraded", "ready"]),
  title: z.string(),
  description: z.string(),
  missing: z.array(z.string()),
  methods: MethodsSchema.shape.methods,
  product: z.string(),
  plan: z.object({ tier: z.string(), product: z.string(), endsAt: z.string() }).nullable(),
  offers: z.array(OfferSchema),
});

orderRoutes.openapi(
  createRoute({
    method: "get",
    path: "/self-service",
    tags: ["Billing"],
    summary: "Billing page state: readiness, live methods, current plan, offers",
    request: { query: OffersQuerySchema },
    responses: {
      200: {
        description: "What the billing page shows",
        content: { "application/json": { schema: SelfServiceSchema } },
      },
    },
  }),
  async (c) => {
    const product = c.req.valid("query").product ?? "app";
    const tenant = c.get("tenant");
    const owner =
      (tenant.organizationId as string | undefined) ??
      (await personalTenants().find(tenant.userId as string)) ??
      undefined;
    let plan: { tier: string; product: string; endsAt: string } | null = null;
    if (owner) {
      try {
        const membership = await getMembership(owner, product);
        if (membership) {
          plan = {
            tier: membership.tier,
            product: membership.product,
            endsAt: membership.endsAt.toISOString(),
          };
        }
      } catch (error) {
        // A missing membership table or tenant DB is a free plan, not a broken page.
        logger.warn("Billing self-service could not read the membership", { product, error });
      }
    }
    return c.json(
      {
        ...resolveSelfServiceReadiness(),
        product,
        plan,
        offers: listOffers(product).map(publicOffer),
      },
      200,
    );
  },
);

// ── POST /orders/{id}/verify ──────────────────────────────────────────────────
// The buyer is back from Creem's checkout. The webhook normally settles the
// order within seconds, but it cannot reach a laptop and can be lost; this asks
// Creem about this one order and settles it when the checkout completed — the
// same check the reconcile job makes, run on the buyer's return.

orderRoutes.openapi(
  createRoute({
    method: "post",
    path: "/orders/{id}/verify",
    tags: ["Billing", "Orders"],
    summary: "Ask the payment provider about a pending order and settle it if paid",
    request: { params: z.object({ id: z.string().min(1).max(64) }) },
    responses: {
      200: {
        description: "Order status after the check",
        content: { "application/json": { schema: OrderStatusSchema } },
      },
      404: {
        description: "No such order for this buyer",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    let order = await getPaymentOrder(id);
    if (!order || !(await readableTenants(c)).includes(order.tenantId)) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (order.status === "PENDING" && order.provider === "creem" && order.providerRef) {
      try {
        const ref = order.providerRef;
        const checkout = await billingServiceBreaker.call(() => getCreemCheckout(ref));
        if (checkout.status === "completed" && checkout.order) {
          const paid = checkout.order;
          await settlePaymentOrder({
            orderId: order.id,
            paidMinor: paid.amount,
            currency: paid.currency,
            providerRef: paid.id,
          });
          order = (await getPaymentOrder(id)) ?? order;
        }
      } catch (error) {
        // The order stays PENDING; the webhook or the reconcile job settles it later.
        logger.warn("Order verify could not reach the provider", { orderId: id, error });
      }
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
