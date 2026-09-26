"use client";

import { Button, Card, ChoiceboxGroup, Input } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CheckoutOffer,
  type Currency,
  type LiveMethod,
  type PaymentMethod,
  parseAmount,
} from "@/lib/billing/checkout";
import { readOrder, startCheckout } from "./actions";

const POLL_MS = 2_000;
/** An order stays payable for 30 minutes; after that the gateway expires it. */
const POLL_FOR_MS = 31 * 60 * 1_000;
const ORDER_KEY = (offerId: string) => `checkout:order:${offerId}`;
const PRESETS: Record<Currency, number[]> = {
  USD: [5, 20, 50, 100],
  CNY: [50, 200, 500, 1000],
};

type Phase =
  | { kind: "choose" }
  | { kind: "starting" }
  | { kind: "qr"; orderId: string; image: string; amount: string }
  | { kind: "confirming"; orderId: string }
  | { kind: "paid" }
  | { kind: "expired" }
  | { kind: "lost" };

type Problem = "forbidden" | "unavailable" | "rejected" | "amount" | null;

export interface CheckoutPanelProps {
  offer: CheckoutOffer;
  productName: string;
  methods: LiveMethod[];
  initialMethod: PaymentMethod | undefined;
  /** A product may suggest an amount; it applies only while that currency is selected. */
  initialAmount: { value: number; currency: Currency } | undefined;
  returnTo: string | null;
  /** The buyer has come back from a payment page. */
  returning: boolean;
  /** Creem appends the order id as `request_id` when it sends the buyer back. */
  returnedOrderId: string | null;
}

function readStoredOrder(offerId: string): string | null {
  try {
    return window.sessionStorage.getItem(ORDER_KEY(offerId));
  } catch {
    return null;
  }
}

function storeOrder(offerId: string, orderId: string | null) {
  try {
    if (orderId) window.sessionStorage.setItem(ORDER_KEY(offerId), orderId);
    else window.sessionStorage.removeItem(ORDER_KEY(offerId));
  } catch {
    // Private mode: the return page falls back to request_id or the billing ledger.
  }
}

export function CheckoutPanel({
  offer,
  productName,
  methods,
  initialMethod,
  initialAmount,
  returnTo,
  returning,
  returnedOrderId,
}: CheckoutPanelProps) {
  const t = useTranslations("billing.checkout");
  const locale = useLocale();
  const [method, setMethod] = useState<PaymentMethod | undefined>(initialMethod);
  const selected = methods.find((m) => m.id === method);
  const currency: Currency | undefined = selected?.currency;
  const range = currency ? offer.customAmount?.[currency] : undefined;
  const [amount, setAmount] = useState(() =>
    initialAmount && initialAmount.currency === selected?.currency
      ? String(initialAmount.value)
      : "",
  );
  const [phase, setPhase] = useState<Phase>({ kind: "choose" });
  const [problem, setProblem] = useState<Problem>(null);
  const backHref = returnTo ?? "/billing";

  const money = useCallback(
    (value: number, cur: string) =>
      new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(value),
    [locale],
  );

  const price = useMemo(() => {
    if (!currency) return undefined;
    const fixed = offer.prices?.[currency];
    if (fixed !== undefined) return fixed;
    if (!range) return undefined;
    const parsed = parseAmount(amount, range);
    return parsed.ok ? parsed.value : undefined;
  }, [amount, currency, offer.prices, range]);

  // ── Waiting for the order to be paid and handed over ──────────────────────
  const orderId = phase.kind === "qr" || phase.kind === "confirming" ? phase.orderId : undefined;
  const startedAt = useRef(Date.now());
  useEffect(() => {
    if (!orderId) return;
    startedAt.current = Date.now();
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const order = await readOrder(orderId);
      if (stopped) return;
      if (order?.status === "PAID" && order.fulfilled) {
        storeOrder(offer.id, null);
        setPhase({ kind: "paid" });
        return;
      }
      if (order?.status === "EXPIRED" || Date.now() - startedAt.current > POLL_FOR_MS) {
        storeOrder(offer.id, null);
        setPhase({ kind: "expired" });
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, offer.id]);

  // Back from a redirect: find the order the buyer just paid for.
  useEffect(() => {
    if (!returning) return;
    const found = returnedOrderId ?? readStoredOrder(offer.id);
    setPhase(found ? { kind: "confirming", orderId: found } : { kind: "lost" });
  }, [returning, returnedOrderId, offer.id]);

  // Paid: go back to the product after a moment, with a button for the impatient.
  useEffect(() => {
    if (phase.kind !== "paid" || !returnTo) return;
    const timer = setTimeout(() => window.location.assign(returnTo), 3_000);
    return () => clearTimeout(timer);
  }, [phase.kind, returnTo]);

  const pay = async () => {
    if (!method) return;
    if (range && price === undefined) {
      setProblem("amount");
      return;
    }
    setProblem(null);
    setPhase({ kind: "starting" });
    const result = await startCheckout({
      offerId: offer.id,
      method,
      ...(range && price !== undefined ? { amount: price } : {}),
      returnTo,
    });
    if (!result.ok) {
      setProblem(result.error);
      setPhase({ kind: "choose" });
      return;
    }
    const { checkout } = result;
    storeOrder(offer.id, checkout.orderId);
    if (checkout.kind === "redirect") {
      window.location.assign(checkout.url);
      return;
    }
    const QRCode = (await import("qrcode")).default;
    const image = await QRCode.toDataURL(checkout.url, { margin: 1, width: 232 });
    setPhase({
      kind: "qr",
      orderId: checkout.orderId,
      image,
      amount: money(checkout.amountMinor / 100, checkout.currency),
    });
  };

  const header = (
    <header className="mb-6">
      <p className="text-sm text-muted-foreground">{productName}</p>
      <h1 className="mt-1 font-semibold text-2xl text-foreground">{offer.name}</h1>
    </header>
  );

  if (phase.kind === "paid") {
    return (
      <Card className="p-6" role="status">
        {header}
        <h2 className="font-semibold text-lg text-foreground">{t("paid.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("paid.body", { product: productName })}
        </p>
        <Button asChild variant="ink" className="mt-6">
          <a href={backHref}>{t("backTo", { product: returnTo ? productName : t("billing") })}</a>
        </Button>
      </Card>
    );
  }

  if (phase.kind === "confirming" || phase.kind === "expired" || phase.kind === "lost") {
    const key = phase.kind;
    return (
      <Card className="p-6" role="status" aria-live="polite">
        {header}
        <h2 className="font-semibold text-lg text-foreground">{t(`${key}.title`)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t(`${key}.body`)}</p>
        {key !== "confirming" ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" variant="ink" onClick={() => setPhase({ kind: "choose" })}>
              {t("tryAgain")}
            </Button>
            <Button asChild variant="outline">
              <a href="/billing">{t("viewOrders")}</a>
            </Button>
          </div>
        ) : null}
      </Card>
    );
  }

  if (phase.kind === "qr") {
    return (
      <Card className="p-6">
        {header}
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-semibold text-3xl text-foreground tabular-nums">{phase.amount}</p>
          <Image
            src={phase.image}
            alt={t("qr.alt")}
            width={232}
            height={232}
            unoptimized
            className="rounded-[var(--radius-md)] border border-border"
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t(method === "wechat" ? "qr.wechat" : "qr.alipay")}
          </p>
          <Button type="button" variant="tertiary" onClick={() => setPhase({ kind: "choose" })}>
            {t("changeMethod")}
          </Button>
        </div>
      </Card>
    );
  }

  if (methods.length === 0) {
    return (
      <Card className="p-6">
        {header}
        <h2 className="font-semibold text-lg text-foreground">{t("closed.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("closed.body")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {header}

      <ChoiceboxGroup
        type="radio"
        label={t("method")}
        showLabel
        value={method ?? ""}
        onValueChange={(value) => {
          const next = methods.find((m) => m.id === value);
          // An amount means nothing in another currency: ¥10 is not $10.
          if (next && next.currency !== currency) {
            setAmount(
              initialAmount && initialAmount.currency === next.currency
                ? String(initialAmount.value)
                : "",
            );
          }
          setMethod(value as PaymentMethod);
          setProblem(null);
        }}
      >
        {methods.map((m) => (
          <ChoiceboxGroup.Item
            key={m.id}
            value={m.id}
            title={t(`methods.${m.id}.title`)}
            description={t(`methods.${m.id}.description`, { currency: m.currency })}
          />
        ))}
      </ChoiceboxGroup>

      {range && currency ? (
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESETS[currency]
              .filter((p) => p >= range.min && p <= range.max)
              .map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={amount === String(preset) ? "secondary" : "outline"}
                  aria-pressed={amount === String(preset)}
                  onClick={() => {
                    setAmount(String(preset));
                    setProblem(null);
                  }}
                >
                  {money(preset, currency)}
                </Button>
              ))}
          </div>
          <Input
            id="checkout-amount"
            label={t("amount.label", { currency })}
            inputMode="decimal"
            value={amount}
            onValueChange={(value) => {
              setAmount(value);
              setProblem(null);
            }}
            description={t("amount.range", {
              min: money(range.min, currency),
              max: money(range.max, currency),
            })}
            {...(problem === "amount" ? { error: t("amount.invalid") } : {})}
          />
        </div>
      ) : null}

      {problem && problem !== "amount" ? (
        <p role="alert" className="mt-4 text-sm text-destructive-strong">
          {t(`problems.${problem}`)}
        </p>
      ) : null}

      <Button
        type="button"
        variant="ink"
        className="mt-6 w-full"
        disabled={!method || phase.kind === "starting"}
        aria-busy={phase.kind === "starting"}
        onClick={() => void pay()}
      >
        {price !== undefined && currency
          ? t("pay", { amount: money(price, currency) })
          : t("payNoAmount")}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(selected?.id === "card" ? "finePrint.card" : "finePrint.wallet")}
      </p>
    </Card>
  );
}
