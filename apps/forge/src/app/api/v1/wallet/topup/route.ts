import { PrepaidWalletError } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { getSessionFromRequest, resolveTenantId } from "@/lib/auth";
import { getDemoWallet } from "@/lib/wallet";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json(
      { error: "auth_required", message: "Sign in required to top up wallet" },
      { status: 401 },
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
  const wallet = getDemoWallet();
  try {
    const result = await wallet.topUp({
      tenantId,
      amount: body.amount,
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      description: "mock prepaid top-up",
      relatedId: `mock_${Date.now()}`,
      metadata: { channel: "mock", product: "forge", userId: session.userId },
    });
    return NextResponse.json({
      ok: true,
      provider: "mock",
      message: "Top-up succeeded (demo).",
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
