import type messages from "../../../messages/en.json";
import type { PublicOffer } from "../../lib/public-offers";

export type PricingTranslator = (
  key: keyof typeof messages.productPricing,
  values?: Record<string, string | number>,
) => string;

export interface PricingProduct {
  id: string;
  name: string;
  href: string;
}

export function ProductOfferList({
  offers,
  products,
  locale,
  t,
}: {
  offers: PublicOffer[];
  products: readonly PricingProduct[];
  locale: string;
  t: PricingTranslator;
}) {
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(
      amount,
    );
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);

  return (
    <div className="mt-12 space-y-12">
      {Array.from(new Set(offers.map((offer) => offer.product))).map((productId) => {
        const product = products.find((item) => item.id === productId);
        return (
          <section key={productId} aria-labelledby={`pricing-${productId}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 id={`pricing-${productId}`} className="text-2xl font-semibold text-foreground">
                {product?.name ?? productId}
              </h2>
              {product ? (
                <a href={product.href} className="text-sm font-medium text-primary hover:underline">
                  {t("viewProduct", { product: product.name })}
                </a>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers
                .filter((offer) => offer.product === productId)
                .map((offer) => (
                  <article
                    key={offer.id}
                    data-offer-id={offer.id}
                    className="rounded-[var(--radius-lg)] border border-border bg-card p-6"
                  >
                    <h3 className="font-semibold text-foreground">{offer.name}</h3>
                    <dl className="mt-4 space-y-2">
                      {(["USD", "CNY"] as const).map((currency) => {
                        const price = offer.prices?.[currency];
                        const range = offer.customAmount?.[currency];
                        if (price === undefined && !range) return null;
                        return (
                          <div key={currency} className="flex flex-wrap justify-between gap-2">
                            <dt className="text-sm text-muted-foreground">{currency}</dt>
                            <dd className="font-semibold tabular-nums text-foreground">
                              {price !== undefined
                                ? money(price, currency)
                                : range
                                  ? t("amountRange", {
                                      min: money(range.min, currency),
                                      max: money(range.max, currency),
                                    })
                                  : null}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    <p className="mt-4 text-sm text-muted-foreground">{t("oneTime")}</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li>{t(offer.account)}</li>
                      {offer.kind === "membership" ? (
                        <>
                          <li>{t("termDays", { days: number(offer.grants.days ?? 0) })}</li>
                          <li>
                            {t("monthlyCredits", {
                              credits: number(offer.grants.monthlyCredits ?? 0),
                            })}
                          </li>
                        </>
                      ) : null}
                      {offer.kind === "credits" ? (
                        <li>{t("creditPack", { credits: number(offer.grants.credits ?? 0) })}</li>
                      ) : null}
                      {offer.grants.expiresInDays ? (
                        <li>{t("expiryDays", { days: number(offer.grants.expiresInDays) })}</li>
                      ) : null}
                      {offer.kind === "balance" ? <li>{t("usageBalance")}</li> : null}
                    </ul>
                  </article>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
