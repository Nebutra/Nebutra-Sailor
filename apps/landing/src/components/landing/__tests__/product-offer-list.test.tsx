import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../../../messages/en.json";
import type { PublicOffer } from "../../../lib/public-offers";
import { ProductOfferList } from "../product-offer-list";

const offers: PublicOffer[] = [
  {
    id: "term",
    product: "kuanlan",
    name: "Pro",
    account: "personal",
    kind: "membership",
    prices: { USD: 9.99, CNY: 79 },
    grants: { tier: "pro", days: 30, monthlyCredits: 3200 },
  },
  {
    id: "pack",
    product: "kuanlan",
    name: "Credit pack",
    account: "personal",
    kind: "credits",
    prices: { USD: 49.99 },
    grants: { credits: 5000, expiresInDays: 730 },
  },
  {
    id: "topup",
    product: "router",
    name: "Router balance",
    account: "workspace",
    kind: "balance",
    customAmount: { USD: { min: 5, max: 10000 } },
    grants: {},
  },
];
const products = [
  {
    id: "kuanlan",
    name: "Kuanlan",
    href: "https://kuanlan.example.com",
    domain: "kuanlan.example.com",
  },
];
const t = createTranslator({ locale: "en", messages: en, namespace: "productPricing" });

describe("public product pricing", () => {
  it("renders actual amounts, terms, grants and top-up ranges in server HTML", () => {
    const html = renderToStaticMarkup(
      <ProductOfferList offers={offers} products={products} locale="en" t={t} />,
    );
    for (const text of [
      "9.99",
      "79.00",
      "49.99",
      "5.00",
      "10,000.00",
      "/ month",
      "3,200 credits / month",
      "5,000 credits",
      "730 days",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("29.00");
    expect(html).toContain('href="https://kuanlan.example.com"');
    for (const offer of offers) expect(html).toContain(`data-offer-id="${offer.id}"`);
  });
  it("does not invent unlisted currencies, prices or expiry for a balance", () => {
    const html = renderToStaticMarkup(
      <ProductOfferList
        offers={offers.filter((offer) => offer.kind === "balance")}
        products={products}
        locale="en"
        t={t}
      />,
    );
    expect(html).not.toContain("CNY");
    expect(html).not.toContain("expire");
    expect(html).toContain("metered usage");
  });
  it("frames a product capture with its real domain, a real alt and AVIF/WebP sources", () => {
    const html = renderToStaticMarkup(
      <ProductOfferList
        offers={offers.filter((offer) => offer.kind === "balance")}
        products={[
          {
            ...(products[0] as (typeof products)[number]),
            id: "router",
            visual: { name: "router-shelf", alt: "A shelf of models", width: 1600, height: 900 },
          },
        ]}
        locale="en"
        t={t}
      />,
    );
    expect(html).toContain('alt="A shelf of models"');
    expect(html).toContain("/images/product/router-shelf.avif");
    expect(html).toContain("kuanlan.example.com");
  });
});
