/**
 * The /billing page's readiness: which payment rail the checkout factory
 * picked, which methods can take money right now, and what to set when none
 * can. Pure over an env so the copy and the ordering are tested without a
 * request.
 *
 * The rail is `detectProvider` from @nebutra/billing — the one place provider
 * detection lives (billing AGENTS.md). Creem is the card rail, WeChat Pay /
 * Alipay the mainland rail, and `NEBUTRA_LOCALE=cn` puts the wallets first.
 */

import { detectProvider, isChinaPayConfigured, isCreemConfigured } from "@nebutra/billing";

export type SelfServiceMethod = "card" | "alipay" | "wechat";

export interface SelfServiceReadiness {
  /** What `detectProvider` resolved: creem, chinapay, manual, or a BILLING_PROVIDER override. */
  provider: string;
  status: "disabled" | "degraded" | "ready";
  title: string;
  description: string;
  /** Env names to set before anything can be bought. Empty when ready or disabled. */
  missing: string[];
  /** Live methods, in the order the page offers them. */
  methods: Array<{ id: SelfServiceMethod; currency: "USD" | "CNY" }>;
}

const CREEM_KEYS = ["CREEM_API_KEY", "CREEM_PRODUCT_ID"] as const;

export function resolveSelfServiceReadiness(
  env: Record<string, string | undefined> = process.env,
): SelfServiceReadiness {
  const provider = detectProvider(env);

  if (env.FEATURE_FLAG_BILLING === "false" || env.NEBUTRA_BILLING_CHECKOUT_MODE === "none") {
    return {
      provider,
      status: "disabled",
      title: "Payments are switched off",
      description:
        "FEATURE_FLAG_BILLING or NEBUTRA_BILLING_CHECKOUT_MODE turns checkout off for this deployment, so plans are shown but cannot be bought.",
      missing: [],
      methods: [],
    };
  }

  const card = isCreemConfigured(env);
  const alipay = isChinaPayConfigured("alipay", env);
  const wechat = isChinaPayConfigured("wechat", env);
  const wallets: SelfServiceReadiness["methods"] = [
    ...(alipay ? [{ id: "alipay" as const, currency: "CNY" as const }] : []),
    ...(wechat ? [{ id: "wechat" as const, currency: "CNY" as const }] : []),
  ];
  const cards: SelfServiceReadiness["methods"] = card ? [{ id: "card", currency: "USD" }] : [];
  // The factory already applied the market rule: under NEBUTRA_LOCALE=cn with
  // a wallet configured it answers "chinapay", and the wallets lead.
  const methods = provider === "chinapay" ? [...wallets, ...cards] : [...cards, ...wallets];

  if (methods.length === 0) {
    return {
      provider,
      status: "degraded",
      title: "Payments are not switched on yet",
      description:
        "Add CREEM_API_KEY and CREEM_PRODUCT_ID to .env.local to take card payments through Creem (set CREEM_TEST_MODE=true for test cards), then restart. For mainland China, add the WECHATPAY_* or ALIPAY_* keys and set NEBUTRA_LOCALE=cn.",
      missing: CREEM_KEYS.filter((key) => !env[key]?.trim()),
      methods,
    };
  }

  const names = methods.map((m) =>
    m.id === "card" ? "card (Creem)" : m.id === "alipay" ? "Alipay" : "WeChat Pay",
  );
  return {
    provider,
    status: "ready",
    title: "Checkout is live",
    description: `Plans and credit packs can be bought here by ${names.join(", ")}.${
      env.CREEM_TEST_MODE === "true" && card ? " Creem is in test mode: use a test card." : ""
    }`,
    missing: [],
    methods,
  };
}
