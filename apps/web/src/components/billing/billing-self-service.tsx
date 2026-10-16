import { brand } from "@nebutra/brand/metadata";
import { getBrandEmail } from "@nebutra/brand/metadata-helpers";
import {
  CheckCircle as CheckCircle2,
  CreditCard,
  External as ExternalLink,
  ShieldOff as ShieldAlert,
  Sparkles,
} from "@nebutra/icons";
import { SettingsSection, SettingsSectionFooter } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";

export type BillingPlanId = "free" | "pro_monthly" | "pro_yearly" | "enterprise";
export type BillingProviderStatus = "disabled" | "ready" | "degraded";
type BillingCheckoutMode = "none" | "individual" | "workspace";

interface BillingCapabilities {
  enabled: boolean;
  checkoutMode: BillingCheckoutMode;
}

export interface BillingSelfServiceEnv extends Record<string, string | undefined> {
  BILLING_PROVIDER?: string;
  FEATURE_FLAG_BILLING?: string;
  NEXT_PUBLIC_API_URL?: string;
  PRICE_ID_PRO_MONTHLY?: string;
  PRICE_ID_PRO_YEARLY?: string;
  STRIPE_PRICE_ID_PRO_MONTHLY?: string;
  STRIPE_PRICE_ID_PRO_YEARLY?: string;
  STRIPE_SECRET_KEY?: string;
}

export interface BillingSelfServiceInput {
  currentPlan: string | null | undefined;
  env?: BillingSelfServiceEnv;
  capabilities?: BillingCapabilities;
}

export interface BillingPlanAction {
  label: string;
  enabled: boolean;
  reason?: string;
  priceId?: string;
  plan?: "pro" | "enterprise";
  interval?: "monthly" | "yearly";
  href?: string;
}

export interface BillingPlanOption {
  id: BillingPlanId;
  name: string;
  badge?: string;
  description: string;
  priceLabel: string;
  cadence: string;
  features: string[];
  active: boolean;
  action: BillingPlanAction;
}

export interface BillingSelfServiceModel {
  activePlan: BillingPlanOption;
  env: Record<BillingPlanId, string | undefined>;
  provider: {
    name: string;
    status: BillingProviderStatus;
    title: string;
    description: string;
  };
  portal: BillingPlanAction;
  plans: BillingPlanOption[];
}

const PLAN_DEFINITIONS: Omit<BillingPlanOption, "active" | "action">[] = [
  {
    id: "free",
    name: "Free",
    description: "For evaluation workspaces and early product discovery.",
    priceLabel: "$0",
    cadence: "forever",
    features: ["1 project", "1 team member", "Basic AI and content tools"],
  },
  {
    id: "pro_monthly",
    name: "Pro",
    badge: "Most practical",
    description: `For teams that run their work on ${brand.name} every day.`,
    priceLabel: "$29",
    cadence: "per month",
    features: ["10 projects", "10 team members", "Advanced analytics", "Priority support"],
  },
  {
    id: "pro_yearly",
    name: "Pro Annual",
    badge: "Save 20%",
    description: "The same Pro workspace with annual planning and lower effective cost.",
    priceLabel: "$279",
    cadence: "per year",
    features: ["Everything in Pro", "Annual invoice cadence", "Reduced monthly equivalent"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Custom",
    description: "For regulated teams that need SSO, audit posture, and contractual support.",
    priceLabel: "Custom",
    cadence: "contract",
    features: ["Unlimited usage policy", "SSO/SAML", "Audit logs", "Dedicated support"],
  },
];

function normalizePlan(plan: string | null | undefined): "FREE" | "PRO" | "ENTERPRISE" {
  const normalized = plan?.toUpperCase();
  if (normalized === "PRO" || normalized === "ENTERPRISE") return normalized;
  return "FREE";
}

function getDetectedProvider(env: BillingSelfServiceEnv) {
  if (env.BILLING_PROVIDER) return env.BILLING_PROVIDER.toLowerCase();
  if (env.STRIPE_SECRET_KEY) return "stripe";
  return "manual";
}

function isEnabled(value: string | undefined) {
  return value === "true" || value === "1";
}

function resolveBillingCapabilities(env: BillingSelfServiceEnv): BillingCapabilities {
  const checkoutMode = env.NEBUTRA_BILLING_CHECKOUT_MODE;

  return {
    enabled: isEnabled(env.FEATURE_FLAG_BILLING),
    checkoutMode:
      checkoutMode === "none" || checkoutMode === "workspace" || checkoutMode === "individual"
        ? checkoutMode
        : "individual",
  };
}

export function getPlanPriceId(
  planId: BillingPlanId,
  env: BillingSelfServiceEnv | Record<BillingPlanId, string | undefined>,
) {
  if ("pro_monthly" in env) {
    return env[planId];
  }

  if (planId === "pro_monthly") {
    return env.STRIPE_PRICE_ID_PRO_MONTHLY ?? env.PRICE_ID_PRO_MONTHLY;
  }

  if (planId === "pro_yearly") {
    return env.STRIPE_PRICE_ID_PRO_YEARLY ?? env.PRICE_ID_PRO_YEARLY;
  }

  return undefined;
}

function isStripePriceId(value: string | undefined) {
  return typeof value === "string" && value.startsWith("price_");
}

function getProviderState(env: BillingSelfServiceEnv, capabilities: BillingCapabilities) {
  if (!capabilities.enabled || capabilities.checkoutMode === "none") {
    return {
      name: "manual",
      status: "disabled" as const,
      title: "Plan changes aren't open yet",
      description:
        "You can compare the plans below. Upgrading opens here once payments are switched on.",
    };
  }

  const provider = getDetectedProvider(env);

  if (provider !== "stripe") {
    return {
      name: provider,
      status: "degraded" as const,
      title: "Subscription self-service needs Stripe",
      description: `A non-Stripe or manual provider is detected. ${brand.name} is not exposing subscription checkout until a supported provider route is configured.`,
    };
  }

  if (!env.STRIPE_SECRET_KEY) {
    return {
      name: "stripe",
      status: "degraded" as const,
      title: "Stripe is selected but not configured",
      description:
        "Set STRIPE_SECRET_KEY and plan price ids before enabling checkout or customer portal actions.",
    };
  }

  const missingPriceIds = ["pro_monthly", "pro_yearly"].filter(
    (planId) => !isStripePriceId(getPlanPriceId(planId as BillingPlanId, env)),
  );

  if (missingPriceIds.length > 0) {
    return {
      name: "stripe",
      status: "degraded" as const,
      title: "Stripe is partially configured",
      description:
        "Customer portal can be requested, but paid plan checkout stays disabled until every paid plan has a Stripe price id.",
    };
  }

  return {
    name: "stripe",
    status: "ready" as const,
    title: "Stripe self-service is ready",
    description: "Checkout and hosted billing portal actions can be exposed for configured plans.",
  };
}

function getActivePlanId(plan: string | null | undefined): BillingPlanId {
  switch (normalizePlan(plan)) {
    case "PRO":
      return "pro_monthly";
    case "ENTERPRISE":
      return "enterprise";
    default:
      return "free";
  }
}

export function buildBillingSelfServiceModel({
  currentPlan,
  env = process.env,
  capabilities = resolveBillingCapabilities(env),
}: BillingSelfServiceInput): BillingSelfServiceModel {
  const activePlanId = getActivePlanId(currentPlan);
  const provider = getProviderState(env, capabilities);
  const normalizedEnv = PLAN_DEFINITIONS.reduce<Record<BillingPlanId, string | undefined>>(
    (acc, plan) => {
      acc[plan.id] = getPlanPriceId(plan.id, env);
      return acc;
    },
    {
      free: undefined,
      pro_monthly: undefined,
      pro_yearly: undefined,
      enterprise: undefined,
    },
  );

  const plans = PLAN_DEFINITIONS.map<BillingPlanOption>((plan) => {
    const priceId = normalizedEnv[plan.id];
    const active = plan.id === activePlanId;
    const isPaidSelfServicePlan = plan.id === "pro_monthly" || plan.id === "pro_yearly";

    let action: BillingPlanAction;
    if (active) {
      action = { label: "Current plan", enabled: false, reason: "Already active." };
    } else if (plan.id === "enterprise") {
      action = {
        label: "Contact sales",
        enabled: true,
        href: `mailto:${getBrandEmail("sales")}?subject=${encodeURIComponent(`${brand.name} Enterprise plan`)}`,
      };
    } else if (!isPaidSelfServicePlan) {
      action = { label: "Included", enabled: false, reason: "No checkout required." };
    } else if (provider.status === "disabled") {
      action = { label: "Checkout unavailable", enabled: false, reason: provider.description };
    } else if (provider.name !== "stripe" || !env.STRIPE_SECRET_KEY) {
      action = { label: "Checkout unavailable", enabled: false, reason: provider.description };
    } else if (!isStripePriceId(priceId)) {
      action = {
        label: "Checkout unavailable",
        enabled: false,
        reason: "Missing checkout price id.",
      };
    } else {
      action = {
        label: "Change plan",
        enabled: true,
        priceId,
        plan: "pro",
        interval: plan.id === "pro_yearly" ? "yearly" : "monthly",
      };
    }

    return {
      ...plan,
      active,
      action,
    };
  });

  const activePlan = plans.find((plan) => plan.active) ?? plans[0];

  return {
    activePlan,
    env: normalizedEnv,
    provider,
    portal: {
      label: "Manage billing",
      enabled: capabilities.enabled && provider.name === "stripe" && !!env.STRIPE_SECRET_KEY,
      reason:
        capabilities.enabled && provider.name === "stripe" && !!env.STRIPE_SECRET_KEY
          ? undefined
          : provider.description,
    },
    plans,
  };
}

export function BillingProviderNotice({ model }: { model: BillingSelfServiceModel }) {
  const tone =
    model.provider.status === "ready"
      ? "border-success/30 bg-success/10 text-success-strong"
      : "border-warning/30 bg-warning/10 text-warning-strong";
  const Icon = model.provider.status === "ready" ? CheckCircle2 : ShieldAlert;

  return (
    <div className={`rounded-[var(--radius-2xl)] border p-4 ${tone}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="">{model.provider.title}</h2>
          <p className="mt-1 text-sm opacity-80">{model.provider.description}</p>
        </div>
      </div>
    </div>
  );
}

export function ActivePlanCard({ model }: { model: BillingSelfServiceModel }) {
  const tc = useTranslations("copy.billingBillingSelfService");
  const tp = useTranslations("copy.billingPlans");
  const plan = model.activePlan;
  const features = tp.raw(`${plan.id}.features`) as string[];
  return (
    <SettingsSection title={tc("activePlan")}>
      {/* The plan is the one object on this page: a lit card, not a paragraph. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-glass-sm">
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-neutral-2 shadow-xs">
              <Sparkles className="size-4 text-ring" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight text-neutral-12">
                {tp(`${plan.id}.name`)}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-neutral-11">
                {tp(`${plan.id}.description`)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight tabular-nums text-neutral-12">
              {plan.id === "enterprise" ? tp("enterprise.price") : plan.priceLabel}
            </p>
            <p className="text-sm text-neutral-10">{tp(`${plan.id}.cadence`)}</p>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border bg-neutral-2/50 px-5 py-4 sm:px-6">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-neutral-11">
              <CheckCircle2 className="size-4 shrink-0 text-success-strong" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {model.portal.enabled ? (
        <form action="/api/billing/portal" method="post">
          <SettingsSectionFooter hint={tp("portalHint")}>
            <Button
              type="submit"
              size="sm"
              prefix={<CreditCard className="size-4" aria-hidden="true" />}
            >
              {tp("manageBilling")}
            </Button>
          </SettingsSectionFooter>
        </form>
      ) : (
        <SettingsSectionFooter hint={tp("portalUnavailable")}>
          <Button type="button" size="sm" variant="outline" disabled>
            {tp("manageBilling")}
          </Button>
        </SettingsSectionFooter>
      )}
    </SettingsSection>
  );
}

export function PlanChoiceGrid({ plans }: { plans: BillingPlanOption[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans
        .filter((plan) => plan.id !== "free")
        .map((plan) => (
          <article
            key={plan.id}
            className={`flex min-h-full flex-col rounded-xl border p-6 ${
              plan.active ? "border-primary/40 bg-primary/10" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg text-neutral-12">{plan.name}</h3>
                <p className="mt-1 text-sm text-neutral-11">{plan.description}</p>
              </div>
              {plan.badge && (
                <span className="rounded-full bg-neutral-12 px-2.5 py-1 text-xs font-medium text-neutral-1">
                  {plan.badge}
                </span>
              )}
            </div>

            <div className="mt-5">
              <span className="text-3xl font-semibold text-neutral-12">{plan.priceLabel}</span>
              <span className="ml-2 text-sm text-neutral-10">{plan.cadence}</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-neutral-11">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success-strong"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>

            <PlanAction action={plan.action} />
          </article>
        ))}
    </div>
  );
}

function PlanAction({ action }: { action: BillingPlanAction }) {
  if (action.href) {
    return (
      <a
        href={action.href}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-border px-4 py-2.5 text-sm font-medium text-neutral-12 transition hover:bg-neutral-3"
      >
        {action.label}
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    );
  }

  if (action.enabled && action.plan && action.interval) {
    return (
      <form action="/api/billing/checkout" method="post" className="mt-6">
        <input data-allow-native type="hidden" name="plan" value={action.plan} />
        <input data-allow-native type="hidden" name="interval" value={action.interval} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-[var(--radius-xl)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          {action.label}
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-xl)] border border-border px-4 py-2.5 text-sm font-medium text-neutral-10 opacity-70"
      title={action.reason}
    >
      {action.label}
    </button>
  );
}
