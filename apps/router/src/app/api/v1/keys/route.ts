import { NextResponse } from "next/server";
import { createKey, listKeys } from "@/lib/demo-store";

export async function GET() {
  return NextResponse.json({ keys: listKeys() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const key = createKey(body.name ?? "default");
  return NextResponse.json({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    fullKey: key.fullKey,
    warning: "Shown once only in demo store",
  });
}
