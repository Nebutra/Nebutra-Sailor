import { Card, Table } from "@nebutra/ui/primitives";
import { getFormatter, getTranslations } from "next-intl/server";
import { getAuthenticatedApi } from "@/lib/api";
import { productName } from "@/lib/billing/checkout";

/**
 * The account ledger (ADR 2026-09-27 product wallets): every payment the
 * organization made, for any product, newest first. Buying happens on each
 * product's own page and on checkout; this is where a buyer finds a receipt.
 */

export interface OrderRow {
  id: string;
  product: string | null;
  name: string;
  status: "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "EXPIRED";
  fulfilled: boolean;
  amountMinor: number;
  currency: string;
  method: "card" | "alipay" | "wechat" | string;
  createdAt: string;
}

async function loadOrders(): Promise<OrderRow[] | null> {
  try {
    const api = await getAuthenticatedApi();
    const { orders } = await api.get<{ orders: OrderRow[] }>("/api/v1/billing/orders?limit=20");
    return orders;
  } catch {
    return null;
  }
}

/** A paid order that has not been handed over yet reads as its own state. */
export function orderState(order: Pick<OrderRow, "status" | "fulfilled">): string {
  return order.status === "PAID" && !order.fulfilled ? "CREDITING" : order.status;
}

export async function OrderHistory() {
  const t = await getTranslations("billing.orders");
  const tc = await getTranslations("billing.checkout.methods");
  const format = await getFormatter();
  const orders = await loadOrders();

  return (
    <section aria-labelledby="orders-heading">
      <div className="mb-3">
        <h2 id="orders-heading" className="font-semibold text-base text-neutral-12">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-11">{t("description")}</p>
      </div>
      <Card className="p-0">
        {orders === null ? (
          <p role="alert" className="p-4 text-sm text-neutral-11">
            {t("unavailable")}
          </p>
        ) : orders.length === 0 ? (
          <p className="p-4 text-sm text-neutral-11">{t("empty")}</p>
        ) : (
          <Table bare>
            <Table.Header>
              <Table.Row>
                <Table.Head>{t("columns.date")}</Table.Head>
                <Table.Head>{t("columns.item")}</Table.Head>
                <Table.Head>{t("columns.method")}</Table.Head>
                <Table.Head alignment="end">{t("columns.amount")}</Table.Head>
                <Table.Head>{t("columns.status")}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell className="whitespace-nowrap tabular-nums">
                    {format.dateTime(new Date(order.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-neutral-10">
                      {order.product ? productName(order.product) : ""}
                    </span>{" "}
                    {order.name}
                  </Table.Cell>
                  <Table.Cell>
                    {["card", "alipay", "wechat"].includes(order.method)
                      ? tc(`${order.method}.title`)
                      : order.method}
                  </Table.Cell>
                  <Table.Cell alignment="end" className="tabular-nums">
                    {format.number(order.amountMinor / 100, {
                      style: "currency",
                      currency: order.currency,
                    })}
                  </Table.Cell>
                  <Table.Cell>{t(`status.${orderState(order)}`)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </section>
  );
}
