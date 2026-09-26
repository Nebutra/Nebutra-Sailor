"use client";

import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
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
  const base = process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim() || `${getBrandOrigin("app")}/checkout`;
  const url = new URL(base);
  url.searchParams.set("offer", OFFER_ID);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("currency", "USD");
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function WalletClient() {
  const { resource, reload } = useConsoleResource<WalletBalance>("wallet", (signal) =>
    consoleApi.wallet(signal),
  );
  const [amount, setAmount] = useState("10");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const currency = resource.data?.currency ?? "USD";

  const topUp = () => {
    const parsed = parseRequiredAmount(amount, { min: MIN_TOP_UP, max: 10_000 });
    if (!parsed.ok) {
      setFieldError(parsed.message);
      return;
    }
    window.location.assign(checkoutUrl(parsed.value, `${window.location.origin}/wallet`));
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,16rem)_1fr]">
      <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
        <p className="text-[11px] text-neutral-10">当前余额</p>
        <AsyncSection
          resource={resource}
          onRetry={reload}
          skeleton={<Skeleton className="mt-2 h-7 w-24" />}
        >
          {(data) => (
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatAmount(data.balance)}
              <span className="ml-1.5 text-sm font-medium text-neutral-10">{data.currency}</span>
            </p>
          )}
        </AsyncSection>
        <p className="mt-2 text-[11px] leading-snug text-neutral-10">
          按量扣费，单次请求精确到 6 位小数。花在哪里见{" "}
          <Link href="/usage" className="underline underline-offset-2">
            用量
          </Link>
          。
        </p>
        {resource.status === "ready" ? (
          <div className="mt-2">
            <RetryButton onRetry={reload} label="刷新余额" />
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
        <p className="mb-2 text-[12px] font-semibold">充值</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const active = amount === String(preset);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAmount(String(preset));
                  setFieldError(null);
                }}
                className={[
                  "h-7 rounded-full border px-2.5 text-[11px] tabular-nums transition-colors",
                  active
                    ? "border-neutral-8 bg-neutral-3 font-medium"
                    : "font-medium border-neutral-6 text-neutral-11 hover:bg-neutral-2",
                ].join(" ")}
              >
                +{preset}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <Input
              label={`金额 (${currency})`}
              id="topup-amount"
              type="number"
              min={MIN_TOP_UP}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setFieldError(null);
              }}
              {...(fieldError ? { error: fieldError } : {})}
            />
          </div>
          <Button type="button" variant="ink" size="sm" className="h-9" onClick={topUp}>
            去付款
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-neutral-10">
          最低 ${MIN_TOP_UP}。支持银行卡、支付宝、微信支付，付完自动回到这里。
        </p>
      </div>
    </div>
  );
}
