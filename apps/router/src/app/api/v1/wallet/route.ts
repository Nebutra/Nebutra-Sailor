import { NextResponse } from "next/server";
import { getWallet } from "@/lib/demo-store";

export async function GET() {
  const balance = await getWallet().getBalance("demo");
  return NextResponse.json(balance);
}
