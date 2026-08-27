import { PrepaidWalletError } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { getSessionFromRequest, resolveTenantId } from "@/lib/auth";
import { getWallet, resolveWalletMode } from "@/lib/wallet";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json(
      { error: "auth_required", message: "Sign in required to top up wallet" },
      { status: 401 },
    );
  }

  // Hard-correct: ledger wallet is funded via billing checkout / webhooks, not a mock API.
  if (resolveWalletMode() === "ledger") {
    return NextResponse.json(
      {
        error: "ledger_topup_via_billing",
        message:
          "Production CreditLedger top-ups go through billing checkout (Stripe/Polar/etc.), not this mock endpoint.",
      },
      { status: 501 },
    );
  }

  let body: { tenantId?: string; amount?: number; currency?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.amount !== "number" || !(body.amount > 0)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  const tenantId = resolveTenantId({
    ...(body.tenantId !== undefined ? { explicit: body.tenantId } : {}),
    session,
  });
  const wallet = await getWallet();
  try {
    const result = await wallet.topUp({
      tenantId,
      amount: body.amount,
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      description: "dev memory prepaid top-up",
      relatedId: `dev_${Date.now()}`,
      metadata: { channel: "dev-memory", product: "forge", userId: session.userId },
    });
    return NextResponse.json({
      ok: true,
      provider: "memory",
      message: "Top-up succeeded (dev memory wallet).",
      ...result,
      tenantId,
    });
  } catch (err) {
    if (err instanceof PrepaidWalletError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }
}
