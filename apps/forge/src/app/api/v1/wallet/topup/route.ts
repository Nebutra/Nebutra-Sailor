import { PrepaidWalletError } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { getDemoWallet } from "@/lib/wallet";

/**
 * POST /api/v1/wallet/topup
 * Body: { tenantId?: string, amount: number, currency?: string }
 *
 * Demo/mock prepaid top-up (302-style wallet). Production: replace with
 * WeChat/Alipay/card webhook → createCreditLedgerWallet(billing).
 */
export async function POST(request: Request) {
  let body: { tenantId?: string; amount?: number; currency?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const amount = body.amount;
  if (typeof amount !== "number" || !(amount > 0)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const tenantId = body.tenantId ?? "demo";
  const wallet = getDemoWallet();

  try {
    const result = await wallet.topUp({
      tenantId,
      amount,
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      description: "mock prepaid top-up",
      relatedId: `mock_${Date.now()}`,
      metadata: { channel: "mock", product: "forge" },
    });
    return NextResponse.json({
      ok: true,
      provider: "mock",
      message: "Top-up succeeded (demo). Wire real CN/Global payments in production.",
      ...result,
    });
  } catch (err) {
    if (err instanceof PrepaidWalletError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }
}
