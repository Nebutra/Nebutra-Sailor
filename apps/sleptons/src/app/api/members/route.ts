import { NextResponse } from "next/server";
import { getPublicMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const tier = searchParams.get("tier") ?? undefined;
  const lookingFor = searchParams.get("lookingFor") ?? undefined;

  try {
    const result = await getPublicMembers({ page, tier, lookingFor });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
