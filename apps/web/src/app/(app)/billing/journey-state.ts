export type JourneySearchParams = Record<string, string | string[] | undefined>;

export interface BillingJourneyAction {
  href: string;
  label: string;
}

export interface BillingJourneyNotice {
  tone: "success" | "warning";
  title: string;
  description: string;
  primaryAction: BillingJourneyAction;
  secondaryAction?: BillingJourneyAction;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isCheckoutSuccess(params: JourneySearchParams) {
  return (
    firstValue(params.billing) === "checkout-success" ||
    firstValue(params.status) === "success" ||
    firstValue(params.checkout) === "success" ||
    firstValue(params.success) === "true" ||
    typeof firstValue(params.session_id) === "string"
  );
}

function isCheckoutCanceled(params: JourneySearchParams) {
  return (
    firstValue(params.billing) === "checkout-canceled" ||
    firstValue(params.status) === "canceled" ||
    firstValue(params.checkout) === "canceled" ||
    firstValue(params.canceled) === "true" ||
    firstValue(params.cancelled) === "true"
  );
}

function isCheckoutFailed(params: JourneySearchParams) {
  return firstValue(params.billing) === "checkout-failed";
}

function isPortalFailed(params: JourneySearchParams) {
  return firstValue(params.billing) === "portal-failed";
}

export function resolveBillingJourneyNotice(
  params: JourneySearchParams,
): BillingJourneyNotice | null {
  if (isCheckoutSuccess(params)) {
    return {
      tone: "success",
      title: "Checkout complete",
      description:
        "Your billing session returned successfully. Finish the SaaS setup loop by inviting teammates and reviewing usage.",
      primaryAction: { href: "./settings/team", label: "Invite your team" },
      secondaryAction: { href: "./usage", label: "Review usage" },
    };
  }

  if (isCheckoutCanceled(params)) {
    return {
      tone: "warning",
      title: "Checkout canceled",
      description:
        "No plan change was applied. You can pick another plan or keep the current workspace settings.",
      primaryAction: { href: "./billing", label: "Choose a plan" },
    };
  }

  if (isCheckoutFailed(params)) {
    return {
      tone: "warning",
      title: "Checkout could not start",
      description:
        "No plan change was applied because the billing provider could not create a checkout session. Retry after provider setup is fixed.",
      primaryAction: { href: "./billing", label: "Retry checkout" },
    };
  }

  if (isPortalFailed(params)) {
    return {
      tone: "warning",
      title: "Billing portal unavailable",
      description:
        "The hosted billing portal could not be opened. Your current plan is unchanged; retry from billing once the provider is ready.",
      primaryAction: { href: "./billing", label: "Back to billing" },
    };
  }

  return null;
}
