import { NextResponse } from "next/server";
import { getSessionFromRequest, resolveTenantId } from "@/lib/auth";
import { getDemoWallet } from "@/lib/wallet";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const explicit = new URL(request.url).searchParams.get("tenantId");
  const tenantId = resolveTenantId({ explicit, session });
  const wallet = getDemoWallet();
  if (
    tenantId !== "anonymous" &&
    "seed" in wallet &&
    typeof (wallet as { seed?: unknown }).seed === "function"
  ) {
    const current = await wallet.getBalance(tenantId);
    if (current.balance === 0) {
      (wallet as { seed: (id: string, amount: number) => void }).seed(tenantId, 100);
    }
  }
  const balance = await wallet.getBalance(tenantId);
  return NextResponse.json({ ...balance, tenantId, signedIn: Boolean(session?.userId) });
}
