"use client";

import { checkoutLink } from "@nebutra/billing/links";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { Button, NumberField } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AsyncSection, RetryButton, Skeleton } from "@/components/console-states";
import { consoleApi, type WalletBalance } from "@/lib/console-api";
import { formatAmount, parseRequiredAmount } from "@/lib/console-format";
import { useConsoleResource } from "@/lib/use-console-resource";

/**
 * The wallet.
 *
 * Topping up is a payment, and payments happen on the one checkout page (ADR
 * 2026-09-27 product wallets): this page names an amount and hands the buyer
 * over; checkout sends them back here once the balance has been credited. The
 * amount is parsed before anything is sent, so an empty box never becomes a
 * bare 400 on the other side.
 */

const PRESETS = [5, 10, 25, 50, 100];
/** The catalog's USD floor for `router_topup`, same as 302.AI's. */
const MIN_TOP_UP = 5;
const OFFER_ID = "router_topup";

export function checkoutUrl(amount: number, returnTo: string): string {
  return checkoutLink({
    checkoutUrl:
      process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim() || `${getBrandOrigin("app")}/checkout`,
    offerId: OFFER_ID,
    amount,
    currency: "USD",
    returnTo,
  });
}

export function WalletClient() {
  const t = useTranslations("console.wallet");
  const tErrors = useTranslations("console.errors");
  const { resource, reload } = useConsoleResource<WalletBalance>("wallet", (signal) =>
    consoleApi.wallet(signal),
  );
  const [amount, setAmount] = useState("10");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const currency = resource.data?.currency ?? "USD";

  const topUp = () => {
    const parsed = parseRequiredAmount(amount, { min: MIN_TOP_UP, max: 10_000 });
    if (!parsed.ok) {
      setFieldError(tErrors(parsed.error.key, parsed.error.values));
      return;
    }
    window.location.assign(checkoutUrl(parsed.value, `${window.location.origin}/wallet`));
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,16rem)_1fr]">
      <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
        <p className="text-xs text-muted-foreground">{t("balance")}</p>
        <AsyncSection
          resource={resource}
          onRetry={reload}
          skeleton={<Skeleton className="mt-2 h-7 w-24" />}
        >
          {(data) => (
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatAmount(data.balance)}
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                {data.currency}
              </span>
            </p>
          )}
        </AsyncSection>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {t.rich("note", {
            link: (chunks) => (
              <Link href="/usage" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
        {resource.status === "ready" ? (
          <div className="mt-2">
            <RetryButton onRetry={reload} label={t("refresh")} />
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
        <p className="mb-2 text-xs font-semibold">{t("topUp")}</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const active = amount === String(preset);
            return (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={active}
                onClick={() => {
                  setAmount(String(preset));
                  setFieldError(null);
                }}
                className={[
                  "h-7 rounded-full px-2.5 text-xs font-medium tabular-nums",
                  active ? "border-neutral-8 bg-neutral-3" : "border-neutral-6 text-neutral-11",
                ].join(" ")}
              >
                +{preset}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <NumberField
              label={t("amount", { currency })}
              id="topup-amount"
              min={MIN_TOP_UP}
              value={amount}
              onValueChange={(value) => {
                setAmount(value == null ? "" : String(value));
                setFieldError(null);
              }}
              {...(fieldError ? { error: fieldError } : {})}
            />
          </div>
          <Button type="button" variant="ink" size="sm" className="h-9" onClick={topUp}>
            {t("pay")}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {t("footnote", { min: String(MIN_TOP_UP) })}
        </p>
      </div>
    </div>
  );
}
