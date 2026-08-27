import { BillingError } from "../types";

export const CHECKOUT_PLANS = ["pro", "enterprise"] as const;
export const CHECKOUT_INTERVALS = ["monthly", "yearly"] as const;

export type CheckoutPlanId = (typeof CHECKOUT_PLANS)[number];
export type CheckoutInterval = (typeof CHECKOUT_INTERVALS)[number];

export interface CheckoutSelection {
  plan: CheckoutPlanId;
  interval: CheckoutInterval;
}

export interface CheckoutOffer {
  plan: CheckoutPlanId;
  interval: CheckoutInterval;
  priceId: string;
  quantity: 1;
  trialPeriodDays?: number;
}

const PRICE_ENV: Record<`${CheckoutPlanId}_${CheckoutInterval}`, string> = {
  pro_monthly: "STRIPE_PRICE_ID_PRO_MONTHLY",
  pro_yearly: "STRIPE_PRICE_ID_PRO_YEARLY",
  enterprise_monthly: "STRIPE_PRICE_ID_ENTERPRISE_MONTHLY",
  enterprise_yearly: "STRIPE_PRICE_ID_ENTERPRISE_YEARLY",
};

const TRIAL_ENV: Partial<Record<CheckoutPlanId, string>> = {
  pro: "STRIPE_TRIAL_DAYS_PRO",
  enterprise: "STRIPE_TRIAL_DAYS_ENTERPRISE",
};

export function parseCheckoutSelection(input: {
  plan?: unknown;
  interval?: unknown;
}): CheckoutSelection {
  const plan = normalizePlan(input.plan);
  const interval = normalizeInterval(input.interval);
  if (!plan || !interval) {
    throw new BillingError(
      "Checkout requires a catalog plan and interval",
      "CHECKOUT_SELECTION_INVALID",
      400,
    );
  }
  return { plan, interval };
}

export function resolveCheckoutOffer(
  selection: CheckoutSelection,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutOffer {
  const envKey = PRICE_ENV[`${selection.plan}_${selection.interval}`];
  const priceId = env[envKey];
  if (typeof priceId !== "string" || !priceId.startsWith("price_")) {
    throw new BillingError(
      `Checkout catalog is missing ${envKey}`,
      "CHECKOUT_PRICE_UNCONFIGURED",
      503,
    );
  }

  const trialPeriodDays = readCatalogTrial(selection.plan, env);
  return {
    ...selection,
    priceId,
    quantity: 1,
    ...(trialPeriodDays !== undefined ? { trialPeriodDays } : {}),
  };
}

export function resolveCheckoutReturnUrls(env: NodeJS.ProcessEnv = process.env): {
  successUrl: string;
  cancelUrl: string;
} {
  const origin = resolveProductOrigin(env);
  return {
    successUrl: `${origin}/checkout-return?billing=checkout-success`,
    cancelUrl: `${origin}/checkout-return?billing=checkout-canceled`,
  };
}

export function assertProductReturnUrl(
  value: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BillingError("Invalid billing return URL", "CHECKOUT_RETURN_URL_INVALID", 400);
  }

  const allowed = new URL(resolveProductOrigin(env));
  if (parsed.origin !== allowed.origin) {
    throw new BillingError(
      "Billing return URL must stay on the product origin",
      "CHECKOUT_RETURN_URL_FORBIDDEN",
      400,
    );
  }
  return parsed.toString();
}

function resolveProductOrigin(env: NodeJS.ProcessEnv): string {
  const configured = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL;
  if (typeof configured === "string" && configured.length > 0) {
    return new URL(configured).origin;
  }
  throw new BillingError(
    "APP_URL is required to build billing return URLs",
    "CHECKOUT_APP_URL_MISSING",
    503,
  );
}

function normalizePlan(value: unknown): CheckoutPlanId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pro" || normalized === "plan_pro") return "pro";
  if (normalized === "enterprise" || normalized === "plan_enterprise") return "enterprise";
  if (normalized === "pro_monthly" || normalized === "pro_yearly") return "pro";
  return CHECKOUT_PLANS.includes(normalized as CheckoutPlanId)
    ? (normalized as CheckoutPlanId)
    : null;
}

function normalizeInterval(value: unknown): CheckoutInterval | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "month" || normalized === "monthly") return "monthly";
  if (normalized === "year" || normalized === "yearly") return "yearly";
  return null;
}

function readCatalogTrial(plan: CheckoutPlanId, env: NodeJS.ProcessEnv): number | undefined {
  const raw = env[TRIAL_ENV[plan] ?? ""];
  if (!raw) return undefined;
  const days = Number.parseInt(raw, 10);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  return Math.min(days, 30);
}
