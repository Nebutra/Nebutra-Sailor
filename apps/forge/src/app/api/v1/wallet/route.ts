import { NextResponse } from "next/server";
import { getSessionFromRequest, resolveTenantId } from "@/lib/auth";
import { getWallet, resolveWalletMode } from "@/lib/wallet";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const explicit = new URL(request.url).searchParams.get("tenantId");
  const tenantId = resolveTenantId({ explicit, session });

  let wallet;
  try {
    wallet = await getWallet();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        code: "wallet_unavailable",
        mode: resolveWalletMode(),
        message,
        hint:
          "Production ledger needs DATABASE_URL + @nebutra/billing. " +
          "Set FORGE_WALLET_MODE=memory and FORGE_ALLOW_MEMORY_WALLET=1 only as temporary emergency.",
      },
      { status: 503 },
    );
  }

  try {
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
    return NextResponse.json({
      ...balance,
      tenantId,
      signedIn: Boolean(session?.userId),
      mode: resolveWalletMode(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        code: "wallet_error",
        mode: resolveWalletMode(),
        message,
      },
      { status: 503 },
    );
  }
}
