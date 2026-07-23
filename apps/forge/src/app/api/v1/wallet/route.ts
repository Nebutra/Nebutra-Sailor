import { NextResponse } from "next/server";
import { getDemoWallet } from "@/lib/wallet";

/** GET /api/v1/wallet?tenantId=demo — prepaid balance (demo wallet). */
export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? "demo";
  const wallet = getDemoWallet();
  const balance = await wallet.getBalance(tenantId);
  return NextResponse.json(balance);
}
