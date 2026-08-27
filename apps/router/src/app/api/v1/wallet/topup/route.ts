import { NextResponse } from "next/server";
import { getWallet } from "@/lib/demo-store";

export async function POST(request: Request) {
  const body = (await request.json()) as { amount?: number };
  const amount = body.amount;
  if (typeof amount !== "number" || !(amount > 0)) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }
  const result = await getWallet().topUp({
    tenantId: "demo",
    amount,
    description: "router mock top-up",
  });
  return NextResponse.json({
    ok: true,
    message: "Mock top-up ok — wire real payments in production",
    ...result,
  });
}
