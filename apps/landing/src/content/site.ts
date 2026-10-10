/**
 * Your marketing site's structure and config — not its words.
 *
 * Every sentence the starter site shows lives in messages/en.json under the
 * `site` namespace (Simplified Chinese in zh-Hans.json, Traditional
 * in zh-Hant.json), read with getTranslations / useTranslations. This file
 * only keeps what isn't a sentence: plan ids, prices, hrefs, icons and the
 * `highlight` flag — the shape src/components/starter/ lays out.
 *
 * To reword the site: edit messages/en.json → site.* (+ the zh-* files).
 * To restructure it (add a plan, drop a nav link, change a price): edit here.
 *
 * - An array item that needs its own copy (a feature, a plan, a question, a
 *   nav or footer link) carries an `id` — the key messages/*.json → site.*
 *   uses for that item (e.g. `site.pricing.plans.pro.name`,
 *   `site.faq.items.cancel.q`). Components read it with `SiteTranslator`
 *   (see below), the same escape hatch `PackageCatalogTranslator` uses for
 *   the features index — a key built from a config id at runtime can't
 *   satisfy next-intl's literal-per-call key type.
 * - Links point at pages the site serves (see src/site-map.ts) or at the
 *   product app (`app:` + a path, e.g. `app:/sign-in`).
 *
 * Pricing: these are the prices the site shows. What a customer is actually
 * charged is the offer catalogue in @nebutra/billing (`configureOffers`) and
 * your payment provider's prices — keep the three in step when you change one.
 */

import type { IconName } from "@/components/starter/starter-icon";

/**
 * The messages/*.json `site` namespace's translator, for the entries this
 * file keys by id — the key is built from the id at runtime (a plan, a
 * feature, a question, a nav or footer link), so it can never satisfy
 * next-intl's per-literal-key translator type. Cast at the call site, same
 * shape as `PackageCatalogTranslator` in
 * components/landing/features/package-feature-data.ts.
 */
export type SiteTranslator = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => unknown;
};

export interface Href {
  /** A site path ("/pricing", "/#features") or a product-app path ("app:/sign-in"). */
  href: string;
}

export interface Link extends Href {
  /** The key into messages/*.json → site.nav.<id> / site.footer.columns.<col>.links.<id>. */
  id: string;
}

export interface Feature {
  /** Also the key into messages/*.json → site.features.items.<icon>. */
  icon: IconName;
}

export type Currency = "USD" | "CNY";

export interface Plan {
  /** The key into messages/*.json → site.pricing.plans.<id>. */
  id: string;
  /** Per month, in whole units. `null` = priced on request. 0 = free. */
  price: Record<"monthly" | "yearly", Record<Currency, number> | null>;
  cta: Href;
  /** Draws the card forward and shows the plan's `highlightLabel`. */
  highlight?: boolean;
}

export interface Question {
  /** The key into messages/*.json → site.faq.items.<id>. */
  id: string;
}

export const SITE = {
  hero: {
    primary: { href: "app:/sign-in?mode=sign-up" } satisfies Href,
    secondary: { href: "/pricing" } satisfies Href,
  },

  features: {
    items: [
      { icon: "fingerprint" },
      { icon: "users" },
      { icon: "card" },
      { icon: "globe" },
      { icon: "shield" },
      { icon: "plug" },
    ] satisfies Feature[],
  },

  pricing: {
    plans: [
      {
        id: "free",
        price: { monthly: { USD: 0, CNY: 0 }, yearly: { USD: 0, CNY: 0 } },
        cta: { href: "app:/sign-in?mode=sign-up" },
      },
      {
        id: "pro",
        price: { monthly: { USD: 12, CNY: 88 }, yearly: { USD: 10, CNY: 73 } },
        cta: { href: "app:/sign-in?mode=sign-up" },
        highlight: true,
      },
      {
        id: "business",
        price: { monthly: null, yearly: null },
        cta: { href: "/contact" },
      },
    ] satisfies Plan[],
  },

  faq: {
    items: [
      { id: "free-plan" },
      { id: "change-plans" },
      { id: "cancel" },
      { id: "data-location" },
      { id: "payment-methods" },
      { id: "export-data" },
    ] satisfies Question[],
  },

  cta: {
    primary: { href: "app:/sign-in?mode=sign-up" } satisfies Href,
    secondary: { href: "/contact" } satisfies Href,
  },

  // Four links: with the brand, language, Sign in and Get started that is the
  // eight groups a calm top bar holds. FAQ stays one click away in the footer.
  nav: [
    { id: "features", href: "/#features" },
    { id: "pricing", href: "/pricing" },
    { id: "blog", href: "/blog" },
    { id: "contact", href: "/contact" },
  ] satisfies Link[],

  footer: {
    columns: [
      {
        id: "product",
        links: [
          { id: "features", href: "/#features" },
          { id: "pricing", href: "/pricing" },
          { id: "faq", href: "/faq" },
          { id: "signIn", href: "app:/sign-in" },
        ] satisfies Link[],
      },
      {
        id: "company",
        links: [
          { id: "blog", href: "/blog" },
          { id: "contact", href: "/contact" },
        ] satisfies Link[],
      },
      {
        id: "legal",
        links: [
          { id: "privacy", href: "/privacy" },
          { id: "terms", href: "/terms" },
          { id: "cookies", href: "/cookies" },
          { id: "refunds", href: "/refund" },
          { id: "dpa", href: "/dpa" },
        ] satisfies Link[],
      },
    ],
  },
};
