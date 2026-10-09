import { CheckCircle } from "@nebutra/icons";
import type { ReactNode } from "react";
import type messages from "../../../messages/en.json";
import type { PublicOffer } from "../../lib/public-offers";

export type PricingTranslator = (
  key: Exclude<keyof typeof messages.productPricing, "faq">,
  values?: Record<string, string | number>,
) => string;

export interface PricingProduct {
  id: string;
  name: string;
  href: string;
  /** What the product is, one line. */
  what?: string;
  /** Bare domain, shown in the window's title bar. */
  domain?: string;
}

const CURRENCIES = ["USD", "CNY"] as const;
type Currency = (typeof CURRENCIES)[number];

const ctaClass =
  "inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors duration-micro hover:bg-accent";

/**
 * Every listed product as one framed window: a title bar with its address, then
 * what it sells. Memberships become plan cards, credit packs a table, a balance
 * a top-up range. Everything printed here comes from the offers it is given.
 */
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
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  const moneyShort = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const term = (days: number) =>
    days === 30
      ? t("termMonth")
      : days === 365
        ? t("termYear")
        : t("termOther", { days: number(days) });
  const per = (days: number) => (days === 365 ? t("perYear") : t("perMonth"));

  return (
    <div className="mt-16 space-y-10">
      {Array.from(new Set(offers.map((offer) => offer.product))).map((productId) => {
        const product = products.find((item) => item.id === productId);
        const own = offers.filter((offer) => offer.product === productId);
        const balances = own.filter((offer) => offer.kind === "balance");
        const memberships = own.filter((offer) => offer.kind === "membership");
        const packs = own.filter((offer) => offer.kind === "credits");
        const name = product?.name ?? productId;

        const tiers = new Map<string, PublicOffer[]>();
        for (const offer of memberships) {
          const key = offer.grants.tier ?? offer.name;
          tiers.set(key, [...(tiers.get(key) ?? []), offer]);
        }

        return (
          <section
            key={productId}
            id={`pricing-${productId}`}
            aria-labelledby={`pricing-${productId}-title`}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-ambient-sm"
          >
            {/* The window's title bar: the product's real address. */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
              <span aria-hidden className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
              </span>
              <span className="flex-1 truncate text-center font-mono text-xs text-muted-foreground">
                {product?.domain ?? productId}
              </span>
              {product ? (
                <a
                  href={product.href}
                  className="shrink-0 text-xs font-medium text-muted-foreground transition-colors duration-micro hover:text-foreground"
                >
                  {t("viewProduct", { product: name })} ↗
                </a>
              ) : null}
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-4">
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-lg border border-border bg-background font-heading text-lg text-foreground"
                >
                  {name.charAt(0)}
                </span>
                <div className="min-w-[12rem] flex-1">
                  <h2
                    id={`pricing-${productId}-title`}
                    className="font-heading text-2xl tracking-tight text-foreground"
                  >
                    {name}
                  </h2>
                  {product?.what ? (
                    <p className="text-sm text-muted-foreground">{product.what}</p>
                  ) : null}
                </div>
                <span className="hidden rounded-full border border-border px-3 py-1 sm:inline-block text-xs text-muted-foreground">
                  {balances.length > 0 && memberships.length === 0 && packs.length === 0
                    ? t("usageBased")
                    : t("membershipsAndCredits")}
                </span>
              </div>

              {balances.map((offer) => (
                <BalanceBlock
                  key={offer.id}
                  offer={offer}
                  money={money}
                  moneyShort={moneyShort}
                  t={t}
                />
              ))}

              {tiers.size > 0 ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {Array.from(tiers.entries()).map(([tier, tierOffers]) => {
                    const sorted = [...tierOffers].sort(
                      (a, b) => (a.grants.days ?? 0) - (b.grants.days ?? 0),
                    );
                    const [first, ...rest] = sorted;
                    if (!first) return null;
                    return (
                      <article
                        key={tier}
                        className="flex flex-col rounded-lg border border-border bg-background p-6"
                      >
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {first.name.split(" · ")[0]}
                        </h3>
                        <PriceRow
                          offer={first}
                          per={per(first.grants.days ?? 30)}
                          big
                          money={money}
                        />
                        <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="size-4 text-muted-foreground" aria-hidden />
                          {t("monthlyCreditsShort", {
                            credits: number(first.grants.monthlyCredits ?? 0),
                          })}
                        </p>
                        {rest.map((offer) => {
                          const usd = offer.prices?.USD;
                          const months = (offer.grants.days ?? 0) / 30;
                          return (
                            <div key={offer.id} className="mt-6 border-t border-border pt-5">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                {term(offer.grants.days ?? 0)}
                              </p>
                              <PriceRow
                                offer={offer}
                                per={per(offer.grants.days ?? 365)}
                                money={money}
                              />
                              {usd !== undefined && months >= 2 ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {t("yearAsMonthly", {
                                    amount: money(usd / Math.round(months), "USD"),
                                  })}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                        <div className="mt-auto pt-6">
                          {product ? (
                            <a href={product.href} className={ctaClass}>
                              {t("choosePlan", { name: first.name.split(" · ")[0] ?? name })}
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {packs.length > 0 ? (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground">{t("creditPacks")}</h3>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-medium">
                            {t("colPack")}
                          </th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">
                            USD
                          </th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">
                            CNY
                          </th>
                          <th scope="col" className="px-4 py-2.5 font-medium">
                            {t("colExpires")}
                          </th>
                          <th scope="col" className="px-4 py-2.5">
                            <span className="sr-only">{t("buyPack")}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {packs.map((offer) => (
                          <tr key={offer.id} data-offer-id={offer.id}>
                            <th scope="row" className="px-4 py-3 font-medium text-foreground">
                              {t("packCredits", { credits: number(offer.grants.credits ?? 0) })}
                            </th>
                            {CURRENCIES.map((currency) => (
                              <td
                                key={currency}
                                className="px-4 py-3 text-right tabular-nums text-foreground"
                              >
                                {offer.prices?.[currency] !== undefined
                                  ? money(offer.prices[currency] as number, currency)
                                  : "–"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-muted-foreground">
                              {offer.grants.expiresInDays
                                ? t("expiresShort", { days: number(offer.grants.expiresInDays) })
                                : t("neverExpires")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {product ? (
                                <a
                                  href={product.href}
                                  className="text-sm font-medium text-foreground hover:underline"
                                >
                                  {t("buyPack")} →
                                </a>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** One price: the USD figure large, the CNY figure beside it, both from the offer. */
function PriceRow({
  offer,
  per,
  big,
  money,
}: {
  offer: PublicOffer;
  per: string;
  big?: boolean;
  money: (amount: number, currency: string) => string;
}): ReactNode {
  return (
    <div data-offer-id={offer.id} className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {CURRENCIES.map((currency: Currency, index) => {
        const price = offer.prices?.[currency];
        if (price === undefined) return null;
        return (
          <p key={currency} className="flex items-baseline gap-1.5 tabular-nums">
            <span
              className={
                index === 0 && big
                  ? "font-heading text-4xl tracking-tight text-foreground"
                  : index === 0
                    ? "font-heading text-2xl tracking-tight text-foreground"
                    : "text-base text-muted-foreground"
              }
            >
              {money(price, currency)}
            </span>
            <span className="text-sm text-muted-foreground">{per}</span>
          </p>
        );
      })}
    </div>
  );
}

function BalanceBlock({
  offer,
  money,
  moneyShort,
  t,
}: {
  offer: PublicOffer;
  money: (amount: number, currency: string) => string;
  moneyShort: (amount: number, currency: string) => string;
  t: PricingTranslator;
}) {
  const usd = offer.customAmount?.USD;
  return (
    <div
      data-offer-id={offer.id}
      className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center"
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("payAsYouGo")}</p>
        {usd ? (
          <p className="mt-3 font-heading text-4xl tracking-tight text-foreground tabular-nums">
            {moneyShort(usd.min, "USD")} – {moneyShort(usd.max, "USD")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-foreground">{t("topUpRange")}</p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("usageBalance")}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                {t("colCurrency")}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                {t("colMinimum")}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                {t("colMaximum")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CURRENCIES.map((currency) => {
              const range = offer.customAmount?.[currency];
              if (!range) return null;
              return (
                <tr key={currency}>
                  <th scope="row" className="px-4 py-3 font-medium text-foreground">
                    {currency}
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {money(range.min, currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {money(range.max, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
