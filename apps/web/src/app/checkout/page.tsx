import { ErrorState } from "@nebutra/ui/layout";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedApi } from "@/lib/api";
import { requireAuthReturningTo } from "@/lib/auth";
import {
  type CheckoutOffer,
  defaultMethod,
  type LiveMethod,
  methodsFor,
  productName,
  resolveReturnTo,
} from "@/lib/billing/checkout";
import { CheckoutPanel } from "./checkout-panel";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function loadCatalog(): Promise<{ offers: CheckoutOffer[]; methods: LiveMethod[] } | null> {
  try {
    const api = await getAuthenticatedApi();
    const [offers, methods] = await Promise.all([
      api.get<{ offers: CheckoutOffer[] }>("/api/v1/billing/offers"),
      api.get<{ methods: LiveMethod[] }>("/api/v1/billing/offers/methods"),
    ]);
    return { offers: offers.offers, methods: methods.methods };
  } catch {
    return null;
  }
}

/**
 * The one payment page (ADR 2026-09-27 product wallets). A product links here
 * as `/checkout?offer=<id>&returnTo=<its page>`; the buyer picks a way to pay,
 * pays by redirect or QR, and is sent back once the order has been handed over.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  // Buyers arrive from other products; after signing in they come back here,
  // to this offer, not to the dashboard.
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? (value[0] ?? "") : value]],
    ),
  );
  await requireAuthReturningTo(`/checkout?${query.toString()}`);
  const t = await getTranslations("billing.checkout");
  const offerId = first(params.offer);
  const catalog = offerId ? await loadCatalog() : null;
  const offer = catalog?.offers.find((o) => o.id === offerId);

  if (!offer || !catalog) {
    return (
      <section className="mx-auto w-full max-w-text px-4 py-12">
        <ErrorState
          title={catalog || !offerId ? t("notForSale.title") : t("unavailable.title")}
          message={catalog || !offerId ? t("notForSale.body") : t("unavailable.body")}
        />
      </section>
    );
  }

  const methods = methodsFor(offer, catalog.methods);
  const locale = await getLocale();
  const requestedAmount = Number(first(params.amount));
  const requestedCurrency = first(params.currency);
  const initialAmount =
    Number.isFinite(requestedAmount) && (requestedCurrency === "USD" || requestedCurrency === "CNY")
      ? { value: requestedAmount, currency: requestedCurrency }
      : undefined;

  return (
    <section className="mx-auto w-full max-w-text px-4 py-12">
      <CheckoutPanel
        offer={offer}
        productName={productName(offer.product)}
        methods={methods}
        initialMethod={defaultMethod(methods, locale)}
        initialAmount={initialAmount}
        returnTo={resolveReturnTo(first(params.returnTo))}
        returning={first(params.paid) === "1"}
        returnedOrderId={first(params.request_id) ?? null}
      />
    </section>
  );
}
