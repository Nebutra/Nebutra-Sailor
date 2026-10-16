import { brand } from "@nebutra/brand/metadata";
import { CheckCircle as CheckCircle2, ShieldOff as ShieldAlert } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  type LiveMethod,
  methodsFor,
  type PaymentMethod,
  walletChannel,
} from "@/lib/billing/checkout";
import { queryKeys } from "@/lib/query-keys";
import {
  BillingRequestError,
  getOrder,
  rememberPendingOrder,
  type SelfServiceOffer,
  startOrder,
  verifyOrder,
} from "./billing-checkout-api";

/**
 * Buying on the product app's /billing page: one card per offer the gateway
 * lists (a plan period or a credit pack), one button per live payment method.
 * A card payment redirects to Creem's hosted checkout; a wallet payment shows
 * its QR code and waits here. Prices, the rail and the paying account are the
 * gateway's decision — the page only names an offer and a method.
 */

const POLL_MS = 2_000;
/** A Creem return is usually settled within seconds; stop asking after this. */
const RETURN_POLL_FOR_MS = 90_000;

type Problem = "forbidden" | "unavailable" | "rejected";

function problemOf(error: unknown): Problem {
  if (error instanceof BillingRequestError) {
    if (error.status === 401 || error.status === 403) return "forbidden";
    if (error.status === 400) return "rejected";
  }
  return "unavailable";
}

function useMoney() {
  const locale = useLocale();
  return (value: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function OfferCheckoutGrid({
  offers,
  methods,
}: {
  offers: SelfServiceOffer[];
  methods: LiveMethod[];
}) {
  if (offers.length === 0) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} methods={methodsFor(offer, methods)} />
      ))}
    </div>
  );
}

function OfferCard({ offer, methods }: { offer: SelfServiceOffer; methods: LiveMethod[] }) {
  const t = useTranslations("billing.checkout");
  const money = useMoney();
  const queryClient = useQueryClient();
  const [qr, setQr] = useState<{ orderId: string; image: string; method: PaymentMethod } | null>(
    null,
  );

  const start = useMutation({
    mutationFn: (method: PaymentMethod) =>
      startOrder({
        offerId: offer.id,
        method,
        channel: walletChannel(navigator.userAgent),
        origin: window.location.origin,
      }),
    onSuccess: async (order, method) => {
      if (order.kind === "redirect") {
        rememberPendingOrder(order.orderId);
        window.location.assign(order.url);
        return;
      }
      const QRCode = (await import("qrcode")).default;
      const image = await QRCode.toDataURL(order.url, { margin: 1, width: 232 });
      setQr({ orderId: order.orderId, image, method });
    },
  });

  const waiting = useQuery({
    queryKey: queryKeys.checkoutStatus.detail(qr?.orderId ?? ""),
    queryFn: () => getOrder(qr?.orderId ?? ""),
    enabled: qr !== null,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (order?.status === "PAID" && order.fulfilled) return false;
      if (order?.status === "EXPIRED") return false;
      return POLL_MS;
    },
  });
  const paid = waiting.data?.status === "PAID" && waiting.data.fulfilled;
  useEffect(() => {
    if (paid) void queryClient.invalidateQueries({ queryKey: queryKeys.billingSelfService.all });
  }, [paid, queryClient]);

  const priceFor = (method: LiveMethod) => {
    const value = offer.prices?.[method.currency];
    return value === undefined ? undefined : money(value, method.currency);
  };
  // The prices a buyer can pay right now; every listed price before any method is live.
  const currencies =
    methods.length > 0
      ? Array.from(new Set(methods.map((m) => m.currency)))
      : (["USD", "CNY"] as const).filter((c) => offer.prices?.[c] !== undefined);
  const shownPrices = currencies
    .flatMap((currency) => {
      const value = offer.prices?.[currency];
      return value === undefined ? [] : [money(value, currency)];
    })
    .join(" · ");

  return (
    <article className="flex min-h-full flex-col rounded-xl border border-border bg-card p-6 shadow-glass-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg text-foreground">{offer.name}</h3>
        {offer.highlight && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {offer.highlight}
          </span>
        )}
      </div>
      {shownPrices && (
        <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {shownPrices}
        </p>
      )}

      <div className="mt-6 flex flex-1 flex-col justify-end gap-2">
        {paid ? (
          <p className="flex items-center gap-2 text-sm text-success-strong" role="status">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t("paid.title")}
          </p>
        ) : qr ? (
          <div className="flex flex-col items-center gap-3">
            {/* biome-ignore lint/performance/noImgElement: a generated data: URL QR code; no image pipeline applies */}
            <img src={qr.image} alt={t("qr.alt")} width={232} height={232} />
            <p className="text-center text-sm text-muted-foreground">
              {t(qr.method === "wechat" ? "qr.wechat" : "qr.alipay")}
            </p>
            {waiting.data?.status === "EXPIRED" && (
              <p className="text-sm text-muted-foreground">{t("expired.body")}</p>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => setQr(null)}>
              {t("changeMethod")}
            </Button>
          </div>
        ) : methods.length === 0 ? (
          <Button type="button" variant="outline" disabled>
            {t("payNoAmount")}
          </Button>
        ) : (
          methods.map((method) => {
            const price = priceFor(method);
            return (
              <Button
                key={method.id}
                type="button"
                variant={method.id === methods[0]?.id ? "default" : "outline"}
                loading={start.isPending && start.variables === method.id}
                disabled={start.isPending}
                onClick={() => start.mutate(method.id)}
              >
                {t(`methods.${method.id}.title`)}
                {" · "}
                {price ? t("pay", { amount: price }) : t("payNoAmount")}
              </Button>
            );
          })
        )}
        {start.isError && (
          <p className="text-sm text-destructive-strong" role="alert">
            {t(`problems.${problemOf(start.error)}`)}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * Back from a payment page with an order to confirm. Asks the gateway to check
 * it with the provider (the webhook cannot reach a laptop, and can be lost),
 * then refreshes the plan once it is paid and handed over.
 */
export function CheckoutReturnNotice({ orderId }: { orderId: string }) {
  const t = useTranslations("billing.checkout");
  const queryClient = useQueryClient();
  const [startedAt] = useState(() => Date.now());

  const verify = useQuery({
    queryKey: [...queryKeys.checkoutStatus.detail(orderId), "verify"],
    queryFn: () => verifyOrder(orderId),
    retry: false,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (order && order.status !== "PENDING") return false;
      if (order?.status === "PENDING" && Date.now() - startedAt > RETURN_POLL_FOR_MS) return false;
      return POLL_MS;
    },
  });

  const order = verify.data;
  const paid = order?.status === "PAID" && order.fulfilled;
  useEffect(() => {
    if (!paid) return;
    rememberPendingOrder(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.billingSelfService.all });
  }, [paid, queryClient]);

  const state = paid
    ? "paid"
    : order?.status === "EXPIRED"
      ? "expired"
      : verify.isError
        ? "lost"
        : "confirming";
  const Icon = paid ? CheckCircle2 : ShieldAlert;
  const tone = paid
    ? "border-success/30 bg-success/10 text-success-strong"
    : "border-warning/30 bg-warning/10 text-warning-strong";

  return (
    <div className={`rounded-[var(--radius-2xl)] border p-4 ${tone}`} role="status">
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h2>{t(`${state}.title`)}</h2>
          <p className="mt-1 text-sm opacity-80">
            {state === "paid" ? t("paid.body", { product: brand.name }) : t(`${state}.body`)}
          </p>
        </div>
      </div>
    </div>
  );
}
