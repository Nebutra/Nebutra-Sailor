import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { getWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

const TopUpBody = z.object({ amount: z.number().positive().max(100_000) });

/**
 * Manual credit grant against the real ledger, for the signed-in tenant.
 *
 * This is not a payment. Checkout, orders, invoices and webhooks are Batch C;
 * until then this route is gated to operators so it cannot mint balance for
 * anyone who can reach the URL. Set `ROUTER_ALLOW_MANUAL_TOPUP=1` to enable it
 * in a non-production environment.
 */
export async function POST(request: Request) {
  if (process.env.ROUTER_ALLOW_MANUAL_TOPUP !== "1") {
    return NextResponse.json(
      { error: "充值渠道尚未开通，请联系我们开通预付账户。" },
      { status: 501 },
    );
  }

  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = TopUpBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "金额需为大于 0 的数字。" }, { status: 400 });
  }

  const result = await getWallet().topUp({
    tenantId: ctx.tenantId,
    amount: parsed.data.amount,
    description: "manual credit grant",
    metadata: { source: "router-console", grantedBy: ctx.userId },
  });
  return NextResponse.json({ ok: true, ...result });
}
